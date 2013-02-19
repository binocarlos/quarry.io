var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/lib/container/browser.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');
var Container = require('./proto');

module.exports = Container;
});

require.define("/lib/container/proto.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var deepdot = require('deepdot');
var inspectselect = require('inspectselect');
var find = require('./find');
var search = require('./search');
//var XML = require('./xml');
var utils = require('../utils');
var Contract = require('../contract');
var PortalWrapper = require('../portal/wrapper');
var Router = require('./router');
var Link = require('./link');

var Container = module.exports = function(){}

/*

  quarry.io - container

  the main dude with data in innit


 */

Container.factory = factory;
Container.new = factory;

Container.fromskeleton = function(skeleton){
  var containerdata = [];

  if(skeleton){
    if(!_.isArray(skeleton)){
      skeleton = [skeleton];
    }

    containerdata = _.map(skeleton, function(data){
      return {
        meta:data
      }
    })
  }

  return factory(containerdata);
}


function extractdata(data, attr){

  if(_.isString(data)){
    // we assume XML
    if(data.match(/^\s*\</)){
      //data = XML.parse(data);
      data = [];
      ensureids = true;
    }
    // or JSON string
    else if(data.match(/^\s*[\[\{]/)){
      data = JSON.parse(data);
    }
    // we could do YAML here
    else{
      data = [{
        meta:{
          tagname:data
        },
        attr:attr || {}
      }]
      ensureids = true;
    }
  }
  else if(!_.isArray(data)){
    if(!data){
      data = {};
    }
    data = [data];
  }

  return data;
}

function factory(data, attr){
  var ensureids = false;
  
  data = extractdata(data, attr);

  function instance(){
    return instance.selector.apply(instance, arguments);
  }

  _.extend(instance, Container.prototype);
  _.extend(instance, EventEmitter.prototype);

  instance.initialize(data);

  if(ensureids){
    instance.ensure_ids();
  }

  return instance;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Model Array Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.initialize = function(data){
  var self = this;

  this.models = _.map(data || [], function(model){
    model.meta || (model.meta = {});
    model.children || (model.children = []);
    
    model.meta.quarryid || (model.meta.quarryid = utils.quarryid());

    return model;
  })

  /*
  
    supplychain we use to fulfill contracts

    invariably - this is connected back to a warehouse or reception somewhere
    
  */
  this.supplychain = null;  

  return this;
}

/*

  make a copy with new ids (deep)
  
*/
Container.prototype.clone = function(new_ids){
  var ret = this.spawn(this.toJSON());

  ret.ensure_ids();

  if(new_ids){
    ret.recurse(function(container){
      container.quarryid(utils.quarryid());
    })
  }

  return ret;
}

/*

  return the first containers meta data
  
*/
Container.prototype.skeleton = function(){

  return this.models.length>0 ? this.models[0].meta : {};
  
}

/*

  ensure a quarryid for each container (deep)
  
*/
Container.prototype.ensure_ids = function(){
  this.recurse(function(container){
    _.each(container.models, function(model){
      model.meta || (model.meta = {});
      !model.meta.quarryid ? (model.meta.quarryid = utils.quarryid()) : null;
    })
  })
  return this;
}

/*

  return a copy of the models - for network transmission mostly
  
*/
Container.prototype.toJSON = function(){
  return JSON.parse(JSON.stringify(this.models));
}

/*

  return a new container with the given data

  the container is hooked up to the same supply chains as the spawner
  
*/
Container.prototype.spawn = function(models){
  var self = this;
  if(arguments.length<=0 || models==null){
    models = []
  }
  else if(!_.isArray(models)){
    models = [models];
  }

  _.each(models, function(model){
    if(!model.meta){
      throw new Error('there is no meta level to the container data - probably a skeleton passed as container data');
    }
    if(!model.meta.quarrysupplier){
      model.meta.quarrysupplier = self.quarrysupplier();
    }
  })

  var ret = factory(models);
  ret.supplychain = this.supplychain;

  return ret;
}

/*

  string summary
  
*/
Container.prototype.summary = function(){
  return this.tagname() + '#' + this.id() + '.' + (this.classnames() || []).join('.') + ' ' + this.attr('name');
}

/*

  model by index
  
*/
Container.prototype.get = function(index){
  return this.models[index];
}

/*

  container at index
  
*/
Container.prototype.eq = function(index){
  return this.spawn(this.get(index));
}

/*

  model by quarryid
  
*/
Container.prototype.byid = function(id){
  return _.find(this.models, function(model){
    return deepdot(model, 'meta.quarryid')==id;
  })
}

/*

  inject data into the existing container
  
*/
Container.prototype.inject = function(replacement){

  var selfmap = this.containermap(true);
  var replacemap = replacement.containermap(true);

  _.each(replacemap, function(replacecontainer, id){
    var selfcontainer = selfmap[id];

    var selfmodel = selfcontainer.get(0);
    var replacemodel = replacecontainer.get(0);

    var injectdata = _.clone(replacemodel);
    delete(replacemodel.children);
    utils.extend(selfmodel, replacemodel);
  })

  return this;
}

/*

  add the models from the given container into this model array
  
*/
Container.prototype.add = function(container){
  var self = this;
  this.models = this.models.concat(container.models);
  return this;
}

/*

  the reverse of add i.e. we add these models to that
  
*/
Container.prototype.pourInto = function(target){
  target.add(this);
  return this;
}

/*

  how many models we have
  
*/
Container.prototype.count = function(){
  return this.models.length;
}



/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Model Array Iterators
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  iterate fn over each container
  
*/
Container.prototype.each = function(fn){
  _.each(this.containers(), fn);
  return this;
}

/*

  iterate fn over each container
  
*/
Container.prototype.map = function(fn){
  return _.map(this.containers(), fn);
}

/*

  turn each model into it's own container (via spawn)
  and return the whole array
  
*/
Container.prototype.containers = function(){
  var self = this;
  return _.map(this.models, function(model){
    return self.spawn(model);
  })
}

/*

  return a map of this.containers() by their quarryid
  
*/
Container.prototype.containermap = function(deep){
  var map = {};
  if(deep){
    this.recurse(function(container){
      map[container.quarryid()] = container;
    })
  }
  else{
    this.each(function(container){
      map[container.quarryid()] = container;
    })  
  }
  
  return map;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Children / Descendents
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  return container with the concatted contents of models.children
  
*/
Container.prototype.children = function(){
  var self = this;
  var all_models = [];
  _.each(this.models, function(model){

    var router = Router(model.meta);

    /*
    
      ensure that the children have the same route as us
      (unless they already have one of their own)
      
    */
    var children = _.map(model.children || [], function(childmodel){

      var quarrysupplier = deepdot(childmodel, 'meta.quarrysupplier');
      if(!quarrysupplier){
        deepdot(childmodel, 'meta.quarrysupplier', router.quarrysupplier());
      }
      return childmodel;
    })
    all_models = all_models.concat(children);
  })
  var ret = this.spawn(all_models);
  ret.parent = this;
  return ret;
}

/*

  remove the models inside of the given container
  from our own child array
  
*/
Container.prototype.removechildren = function(removed){
  var self = this;
  var map = removed.containermap();
  _.each(this.models, function(model){
    model.children = _.filter(model.children, function(child_model){
      return map[child_model.meta.quarryid]==null;
    })
  })
  return this;
}

Container.prototype.remove = function(removed){
  var self = this;
  var map = removed.containermap();
  this.models = _.filter(this.models, function(model){
    return map[model.meta.quarryid]==null;
  })
  return this;
}

/*

  recurse over children and self
  
*/
Container.prototype.recurse = function(fn){
  this.descendents().each(fn);
  return this;
}

/*

  return a flat array of all descendent containers
  
*/
Container.prototype.descendents = function(){
  var all_models = [];
  function find_model(model){
    all_models.push(model);
    _.each(model.children, find_model);
  }

  _.each(this.models, find_model);

  return this.spawn(all_models);
}

Container.prototype.mapdescendents = function(fn){

  return this.spawn(this.map(function(container){
    var newmodel = fn(container.clone()).get(0);

    newmodel.children = container.children().map(function(child){
      var newchild = child.mapdescendents(fn);

      return newchild;
    })

    return newmodel;
  }))
  
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Property Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  generic wrapper function to handle our array of models via a single function

  
*/

function valuereader(model, name){
  return deepdot(model, name);
}
function valuesetter(models, name, value, silent){
  _.each(models, function(model){
    deepdot(model, name, value);
    if(name.indexOf('changed')!=0 && !silent){
      model.changed || (model.changed = {});
      deepdot(model.changed, name, value);
    }
  })
}

function wrapper(key, options){

  options || (options = {});

  if(_.isString(options)){
    options = {
      leaf:options
    }
  }

  var leaf = options.leaf;
  var fullkey = leaf ? key + '.' + leaf : key;

  return function(){
    var self = this;

    /*
    
      READ
      -----
      wholesale getter of the object
      
    */
    if(arguments.length<=0){
      return valuereader(this.models[0], fullkey);
    }
    /*
    
      READ
      -----
      we are reading a first model value

    */
    else if(arguments.length==1 && _.isString(arguments[0]) && !leaf){
      return valuereader(this.models[0], [key, arguments[0]].join('.'));
    }
    /*
    
      WRITE
      -----
      we are setting an object
      
    */
    else if(arguments.length==1){
      var name = fullkey;
      valuesetter(this.models, fullkey, arguments[0], this._silent);
      return self;
    }
    /*
    
      WRITE
      -----
      we are setting a string value
      
    */
    else if(arguments.length>1){
      valuesetter(this.models, [fullkey, arguments[0]].join('.'), arguments[1], this._silent);
      return self;
    }
  }
  
}

var attrwrapper = wrapper('attr');

Container.prototype.attr = wrapper('attr');
Container.prototype.meta = wrapper('meta');
Container.prototype.changed = wrapper('changed');

Container.prototype.quarryid = wrapper('meta', 'quarryid');
Container.prototype.quarryportal = wrapper('meta', 'quarryportal');
Container.prototype.quarrysupplier = wrapper('meta', 'quarrysupplier');

Container.prototype.id = wrapper('meta', 'id');
Container.prototype.tagname = wrapper('meta', 'tagname');
Container.prototype.classnames = wrapper('meta', 'classnames');

Container.prototype.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.unique((deepdot(model, 'meta.classnames') || []).concat(classname));
    deepdot(model, 'changed.meta.classnames', classnames);
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.without((deepdot(model, 'meta.classnames') || []), classname);
    deepdot(model, 'changed.meta.classnames', classnames);
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.hasClass = function(classname){
   return _.contains((this.classnames() || []), classname);
}

Container.prototype.hasAttr = function(name){
  return !_.isEmpty(this.attr(name));
}

Container.prototype.clean = function(){
  _.each(this.models, function(model){
    delete(model.changed);
  })
  return this;
}


/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Local Interface
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  wrap up our selector resolver with the basic search function
  
*/
var finder = find(search.searcher);

Container.prototype.find = function(){
  var selector_strings = _.toArray(arguments);

  var selectors = _.map(selector_strings, inspectselect);

  return finder(selectors, this);
}

/*

  run the filter function over each container individually
  and return a container with the ones that passed (by return true classic filter style)
  
*/
Container.prototype.filter = function(filterfn){

  /*
  
    turn anything other than a function into the filter function

    the compiler looks after turning strings into selector objects
    
  */
  if(!_.isFunction(filterfn)){
    filterfn = search.compiler(filterfn);
  }

  var matching_container_array = _.filter(this.containers(), filterfn);

  var matching_models = [];
  _.each(matching_container_array, function(matching_container){
    matching_models = matching_models.concat(matching_container.models);
  })

  return this.spawn(matching_models);
}

/*

  runs a single selector against this container to see if we have a match
  for ourselves - we always pluck the first model
  
*/
Container.prototype.match = function(selector){

  if(this.count()<=0){
    return false;
  }

  var results = this.filter(selector);

  return results.count()>0;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Network Interface
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Routes and Portals
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  return a portal that is hooked up to the supplychain switchboard client

  (however it wants to look after the transport)
  
*/
Container.prototype.portal = function(){

  return PortalWrapper.portal(this);

}

Container.prototype.radio = function(){

  return PortalWrapper.radio(this);

}


Container.prototype.get_switchboard = function(){
  if(!this.supplychain){
    return null;
  }
  return this.supplychain.switchboard || (this.supplychain.switchboardfactory ? this.supplychain.switchboardfactory() : null);
}

Container.prototype.router = function(){
  return Router(this.skeleton());
}

 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Links
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  produce a new container that is soft-linked to the existing ones
  
*/
Container.prototype.softlink = function(){

  var link = Container.new.apply(null, _.toArray(arguments))

  link.meta_softlinks(this.map(function(container){
    return {
      pointer:container.quarryid(),
      quarrysupplier:container.quarrysupplier()
    }
  }))

  return link;
}

/*

  produce a new container that is hard-linked to the existing ones
  
*/
Container.prototype.hardlink = function(){

  var link = this.mapdescendents(function(container){

    /*
    
      set the id of the hardlinked container for everything in the tree

      these will be used by the server-side sync portal
      
    */
    container.meta('hardlink.pointer', container.quarryid());

    /*
    
      now give it a new quarryid
      
    */
    container.quarryid(utils.quarryid());

    return container;
  })

  /*
  
    set the root id of the hardlink

    this will be used to setup the server-side sync portal
    
  */
  link.meta('hardlink.root', this.quarryid());
  link.meta('hardlink.quarrysupplier', this.quarrysupplier());

  return link;
}

Container.prototype.meta_hardlink = function(){
  if(arguments.length<=0){
    return this.meta('hardlink');
  }
  else{
    this.meta('hardlink', arguments[0]);
    return this;
  }
}

Container.prototype.meta_softlinks = function(){
  if(arguments.length<=0){
    var links = this.meta('softlinks');
    if(!links){
      links = [];
      this.meta('softlinks', links);
    }
    return links;
  }
  else{
    this.meta('softlinks', arguments[0]);
    return this;
  }
}


 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  API
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */


/*

  make a new contract that has the same supply chain handle
  as the container
  
*/
Container.prototype.contractfactory = function(){
  var contract = Contract.factory();
  contract.supplychain = this.supplychain;
  return contract;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Rest
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.rest = function(query){

  query.headers || (query.headers = {});

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - all the results back into a slurp
    
  */
  contract.setType('merge');

  this.each(function(container){

    /*
    
      now create the append request for the merge contract
      
    */

    var raw = _.clone(query);

    raw.path = container.router().rpc();

    if(query.path && query.path!='/'){
      raw.path += query.path;
    }

    var req = Contract.request(raw);

    contract.add(req);
  })

  return contract;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Selector
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.selector = function(){
  
  var args = _.toArray(arguments);

  var json_selectors = _.map(args, function(selectorstring){
    return inspectselect(selectorstring);
  })

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - all the results back into a slurp
    
  */
  contract.setType('merge');

  /*
  
    we map multiparts and take their containers
    
  */
  contract.map_response = function(res){

    var results = [];

    _.each(res.flatten(), function(contractres){
      if(contractres.isContainers()){
        results = results.concat(contractres.body);
      }
    })
    
    return self.spawn(results);
  }

  this.each(function(container){

    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'get',
      path:container.router().rpc()
    })

    req.setHeader('x-json-selectors', json_selectors);

    contract.add(req);
  })

  return contract;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Append
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

// ensure ids on appended models
function childmodelmap(childmodel){
  var ret = JSON.parse(JSON.stringify(childmodel));
  ret.meta.quarryid = utils.quarryid();
  return ret;
}

Container.prototype.append = function(childcontainers){

  var self = this;


  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');

  /*
  
    a map of request path onto body data
    
  */
  var append_requests = {

  }

  /*
  
    a flat map of all models we are sending so we can update their attr once saved
    
  */
  var update_containers = {

  }

  /*

    we copy the models for each of our containers changing
    the id each time

    each container added to each parent is effectively a new model
    whatever the old id was

   */
  function append_single_container(childcontainer){

    childcontainer.recurse(function(descendent){
      delete(descendent.get(0).changed);
    })


    log.info('appending container: ' + childcontainer.summary());

    /*
    
      the models we replace in the child to represent the multiple models
      (perhaps) that now exist because of appending to a container with multiple
      things inside
      
    */
    var newchildmodels = [];

    self.each(function(parentcontainer){

      var parentmodel = parentcontainer.models[0];
      var route = parentcontainer.router().rpc();
      var append = childcontainer.clone();

      /*
      
        make sure all models have new ids (deep)
        
      */
      append.ensure_ids();

      parentmodel.children || (parentmodel.children = []);
      parentmodel.children = parentmodel.children.concat(append.models);

      newchildmodels = newchildmodels.concat(append.models);

      append_requests[route] || (append_requests[route] = []);
      append_requests[route] = append_requests[route].concat(append.models);
    })

    childcontainer.supplychain = self.supplychain;
    
    /*
    
      remap the in-memory container so it has a copy of each appended model
      
    */
    childcontainer.models = newchildmodels;

    childcontainer.recurse(function(descendent){
      update_containers[descendent.quarryid()] = descendent;
    })


  }

  /*
  
    run the append containers through the mapper
    
  */
  childcontainers = _.isArray(childcontainers) ? childcontainers : [childcontainers];
  
  _.each(childcontainers, append_single_container);

  /*
    
    now construct the contract representing what to add to each container
    
  */
  _.each(append_requests, function(data, route){
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'post',
      path:route,
      body:data
    })

    req.setHeader('content-type', 'quarry/containers');
    contract.add(req);
  })

  contract.on('ship', function(mainres){

    if(mainres.hasError()){
      log.error('response error: ' + mainres.body);
      return;
    }

    _.each(mainres.flatten(), function(res){

      if(res.hasError()){
        log.error('response error: ' + res.body);
        return;
      }

      var resultscontainers = self.spawn(res.body);

      resultscontainers.each(function(resultscontainer){

        var realcontainer = update_containers[resultscontainer.quarryid()]

        if(!realcontainer){
          log.error('container update not found: ' + resultsdescendent.summary());
        }
        else{

          realcontainer.inject(resultscontainer);

        }
                
      })

    })
    
  })

  return contract;
}
  
 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Save
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.save = function(){

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');


  /*
    
    now construct the contract representing what to add to each container
    
  */
  this.each(function(savecontainer){
    
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'put',
      path:savecontainer.router().rpc(),
      body:savecontainer.changed()
    })

    contract.add(req);
  })

  contract.on('ship', function(mainres){
    
  })

  return contract;
}

 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Delete
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.delete = function(){

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');


  /*
    
    now construct the contract representing what to add to each container
    
  */
  this.each(function(savecontainer){
    
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'delete',
      path:savecontainer.router().rpc()
    })

    contract.add(req);
  })

  contract.on('ship', function(mainres){
    self.models = [];
  })

  this.emit('delete');
  this.models = [];

  return contract;
}
});

require.define("events",function(require,module,exports,__dirname,__filename,process,global){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/node_modules/deepdot/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js"}
});

require.define("/node_modules/deepdot/index.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = require('./lib/deepdot');
});

require.define("/node_modules/deepdot/lib/deepdot.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('lodash');
var extend = require('xtend');
var EventEmitter = require('events').EventEmitter;

module.exports = deepdot;
module.exports.factory = factory;

function update(obj, prop, value){
  
  var existing_prop = obj[prop];

  if(_.isObject(obj[prop]) && _.isObject(value)){
    extend(obj[prop], value);
  }
  else{
    
    obj[prop] = value;
    
  }

  return value;
}

function deepdot(obj, prop, value){

  if(obj==null){
    return null;
  }
  var parts = prop.split('.');
  var last = parts.pop();
  var current = obj;
  var setmode = arguments.length>=3;

  if(!_.isObject(current)){
    return current;
  }

  while(parts.length>0 && current!=null){

  	var nextpart = parts.shift();
    var nextvalue = current[nextpart]; 
    
    if(!nextvalue){

      if(setmode){
        nextvalue = current[nextpart] = {};
      }
      else{
        break;  
      }
      
    }
    else{
      if(!_.isObject(nextvalue)){
        break;
      }
    }

    current = nextvalue;
  }

  if(!_.isObject(current)){
    return current;
  }

  if(setmode){
    return update(current, last, value);
  }
  else{
    return current[last];
  }
}

/*

  return an event emitter that is hooked into a single object
  
*/
function factory(obj){
  
  function dot(){

    var args = _.toArray(arguments);
    args.unshift(obj);

    var ret = deepdot.apply(null, args);

    if(arguments.length>1){
      dot.emit('change', arguments[0], arguments[1]);
    }

    return ret;
  }

  _.extend(dot, EventEmitter.prototype);

  return dot;
}
});

require.define("/node_modules/deepdot/node_modules/xtend/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index"}
});

require.define("/node_modules/deepdot/node_modules/xtend/index.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = extend

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i],
            keys = Object.keys(source)

        for (var j = 0; j < keys.length; j++) {
            var name = keys[j]
            target[name] = source[name]
        }
    }

    return target
}
});

require.define("/node_modules/inspectselect/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js"}
});

require.define("/node_modules/inspectselect/index.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = require('./lib/inspectselect');
});

require.define("/node_modules/inspectselect/lib/inspectselect.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Module dependencies.
*/

var _ = require('lodash');

module.exports = parse;

/*
  Quarry.io Selector
  -------------------

  Represents a CSS selector that will be passed off to selectors or perform in-memory search

 */

/***********************************************************************************
 ***********************************************************************************
  Here is the  data structure:

  "selector": " > * product.onsale[price<100] > img caption.red, friend",
  "phases":
    [
      [
          {
              "splitter": ">",
              "tagname": "*"
          },
          {
              "splitter": "",
              "tagname": "product",
              "classnames": {
                  "onsale": true
              },
              "attr": [
                  {
                      "field": "price",
                      "operator": "<",
                      "value": "100"
                  }
              ]
          },
          {
              "splitter": ">",
              "tagname": "img"
          },
          {
              "splitter": "",
              "tagname": "caption",
              "classnames": {
                  "red": true
              }
          }
      ],
      [
          {
              "tagname": "friend"
          }
      ]
    ]

 */

/*
  Regular Expressions for each chunk
*/

var chunkers = [
  // the 'type' selector
  {
    name:'tagname',
    regexp:/^(\*|\w+)/,
    mapper:function(val, map){
      map.tagname = val;
    }
  },
  // the '.classname' selector
  {
    name:'classnames',
    regexp:/^\.\w+/,
    mapper:function(val, map){
      map.classnames || (map.classnames={});
      map.classnames[val.replace(/^\./, '')] = true;
    }
  },
  // the '#id' selector
  {
    name:'id',
    regexp:/^#\w+/,
    mapper:function(val, map){
      map.id = val.replace(/^#/, '');
    }
  },
  // the '=quarryid' selector
  {
    name:'quarryid',
    regexp:/^=[\w-]+/,
    mapper:function(val, map){
      map.quarryid = val.replace(/^=/, '');
    }
  },
  {
    name:'hardlink',
    regexp:/^=\>[\w-]*/,
    mapper:function(val, map){
      map.hardlink = val.replace(/^=\>/, '');
    }
  },
  {
    name:'softlink',
    regexp:/^=\~[\w-]*/,
    mapper:function(val, map){
      map.softlink = val.replace(/^=\~/, '');
    }
  },
  // the ':modifier' selector
  {
    name:'modifier',
    regexp:/^:\w+/,
    mapper:function(val, map){
      map.modifier || (map.modifier={});
      map.modifier[val.replace(/^:/, '')] = true;
    }
  },
  // the '[attr<100]' selector
  {
    name:'attr',
    regexp:/^\[.*?["']?.*?["']?\]/,
    mapper:function(val, map){
      map.attr || (map.attr=[]);
      var match = val.match(/\[(.*?)([=><\^\|\*\~\$\!]+)["']?(.*?)["']?\]/);
      if(match){
        map.attr.push({
          field:match[1],
          operator:match[2],
          value:match[3]
        });
      }
      else {
        map.attr.push({
          field:attrString.replace(/^\[/, '').replace(/\]$/, '')
        });
      }
    }
  },
  // the ' ' or ' > ' splitter
  {
    name:'splitter',
    regexp:/^[ ,<>]+/,
    mapper:function(val, map){
      map.splitter = val.replace(/\s+/g, '');
    }

  }
];


/*
  Parse selector string into flat array of chunks
 
  Example in: product.onsale[price<100]
 */
function parseChunks(selector){

  var lastMatch = null;
  var workingString = selector ? selector : '';
  var lastString = '';

  // this is a flat array of type, string pairs
  var chunks = [];

  var matchNextChunk = function(){

    lastMatch = null;

    for(var i in chunkers){
      var chunker = chunkers[i];

      if(lastMatch = workingString.match(chunker.regexp)){

        // merge the value into the chunker data
        chunks.push(_.extend({
          value:lastMatch[0]
        }, chunker));

        workingString = workingString.replace(lastMatch[0], '');

        return true;
      }
    }
    
    return false;

  }
  
  // the main chunking loop happens here
  while(matchNextChunk()){
    
    // this is the sanity check in case we match nothing
    if(lastString==workingString){
      break;
    }
  }

  return chunks;
}

function new_selector(){
  return {
    classnames:{},
    attr:[],
    modifier:{}
  }
}

/*

  turns a selector string into an array of arrays (phases) of selector objects
 
 */
function parse(selector_string){

  if(typeof(selector_string) !== 'string'){
    throw new Error('selector must be a string')
  }

  var chunks = parseChunks(selector_string);

  var phases = [];
  var currentPhase = [];
  var currentSelector = new_selector();

  var addCurrentPhase = function(){
    if(currentPhase.length>0){
      phases.push(currentPhase);
    }
    currentPhase = [];
  }

  var addCurrentSelector = function(){
    if((_.keys(currentSelector)).length>0){
      currentPhase.push(currentSelector);
    }
    currentSelector = new_selector();
  }

  var addChunkToSelector = function(chunk, selector){
    chunk.mapper.apply(null, [chunk.value, selector]);
  }

  _.each(chunks, function(chunk, index){
    if(chunk.name=='splitter' && chunk.value.match(/,/)){
      addCurrentSelector();
      addCurrentPhase();
    }
    else{

      if(chunk.name=='splitter' && index>0){
        addCurrentSelector();
      }

      addChunkToSelector(chunk, currentSelector);

    }
  })

  addCurrentSelector();
  addCurrentPhase();

  return phases;
}
});

require.define("/lib/container/find.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');

/*
  Quarry.io - Find
  ----------------

  A sync version of the selector resolver for use with already loaded containers

  This is used for container.find() to return the results right away jQuery style




 */

module.exports = factory;

function State(arr){
  this.count = arr.length;
  this.index = 0;
  this.finished = false;
}

State.prototype.next = function(){
  this.index++;
  if(this.index>=this.count){
    this.finished = true;
  }
}

/*

  search is the function that accepts a single container and the single selector to resolve
  
*/
function factory(searchfn){

  /*
  
    context is the container to search from

    selectors is the top level array container indivudally processed selector strings
    
  */

  return function(selectors, context){

    var final_state = new State(selectors);
    var final_results = context.spawn();

    /*
    
      loop over each of the seperate selector strings

      container("selectorA", "selectorB")

      B -> A
      
    */
    _.each(selectors.reverse(), function(stage){

      final_state.next();

      /*
      
        this is a merge of the phase results

        the last iteration of this becomes the final results
        
      */
      var stage_results = context.spawn();

      /*
      
        now we have the phases - these can be done in parallel
        
      */
      _.each(stage, function(phase){

        var phase_context = context.clone();

        var selector_state = new State(phase);

        _.each(phase, function(selector){

          selector_state.next();

          var results = searchfn(selector, phase_context);

          /*
          
            quit the stage loop with no results
            
          */
          if(results.count()<=0){
            return false;
          }

          /*
          
            if there is still more to get for this string
            then we update the pipe skeleton
            
          */
          if(!selector_state.finished){
            phase_context = results;
          }
          /*
          
            this
            
          */
          else{
            stage_results.add(results);
          }

          return true;

        })

      

      })

      /*
      
        quit the stages with no results
        
      */
      if(stage_results.count()<=0){
        return false;
      }


      /*
      
        this is the result of a stage - we pipe the results to the next stage
        or call them the final results
        
      */

      if(!final_state.finished){
        context = stage_results;
      }
      else{
        final_results = stage_results;
      }
    })

    return final_results;

  }
}
});

require.define("/lib/container/search.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');
var utils = require('../utils');
var inspectselect = require('inspectselect');

/*
  Quarry.io - Container Search
  ----------------------------

  Takes a search_from container and an array of strings

  It reverses the strings and does a simulated pipe


 */

module.exports.searcher = search;
module.exports.compiler = compile;

/*
  These functions are used to run attribute selectors over in-memory containers
 */
var attr_compare_functions = {
  "=":function(check, target){
    return !_.isUndefined(check) && check==target;
  },
  "!=":function(check, target){
    return !_.isUndefined(check) && check!=target;
  },
  ">":function(check, target){
    target = parseFloat(target);
    return !_.isUndefined(check) && !isNaN(target) ? check > target : false;
  },
  ">=":function(check, target){
    target = parseFloat(target);
    return !_.isUndefined(check) && !isNaN(target) ? check >= target : false;
  },
  "<":function(check, target){
    target = parseFloat(target);
    return !_.isUndefined(check) && !isNaN(target) ? check < target : false;
  },
  "<=":function(check, target){
    target = parseFloat(target);
    return !_.isUndefined(check) && !isNaN(target) ? check <= target : false;
  },
  "^=":function(check, target){
    return !_.isUndefined(check) && check.match(new RegExp('^' + utils.escapeRegexp(target), 'i')) != null;
  },
  "$=":function(check, target){
    return !_.isUndefined(check) && check.match(new RegExp(utils.escapeRegexp(target) + '$', 'i')) != null;
  },
  "~=":function(check, target){
    return !_.isUndefined(check) && check.match(new RegExp('\W' + utils.escapeRegexp(target) + '\W', 'i')) != null;
  },
  "|=":function(check, target){
    return !_.isUndefined(check) && check.match(new RegExp('^' + utils.escapeRegexp(target) + '-', 'i')) != null;
  },
  "*=":function(check, target){
    return !_.isUndefined(check) && check.match(new RegExp(utils.escapeRegexp(target), 'i')) != null;
  },
}

/*

  Turn a selector object into a compiled function to have containers run through
  
 */

function compile(selector){

  if(_.isString(selector)){
    selector = inspectselect(selector);
    selector = selector[0][0];
  }


  // return a function that will return boolean for a container matching this selector
  return function(container){

    // we step through one at a time - as soon as something fails we do not match

    // if we have a wildcard then we pass
    if(selector.tagname=='*'){
      return true;
    }

    // #id
    if(selector.id && container.id()!=selector.id){
      return false;
    }

    // =quarryid
    if(selector.quarryid && container.quarryid()!=selector.quarryid){
      return false;
    }

    // tagname
    if(selector.tagname && container.tagname()!=selector.tagname){
      return false;
    }

    // classnames
    if(selector.classnames){
      var container_classnames = {};
      _.each(container.classnames(), function(classname){
        container_classnames[classname] = true;
      })
      // make sure ALL of the classnames in the selector are in the container
      var all_classnames_present = _.all(_.keys(selector.classnames), function(classname){
        return container_classnames[classname] ? true : false;
      })

      if(!all_classnames_present){
        return false;
      }
    }

    if(selector.attr){

      var all_attributes_passed = _.all(selector.attr, function(attr_filter){

        var check_value = container.attr(attr_filter.field);
        var operator_function = attr_compare_functions[attr_filter.operator];

        // [size]
        if(!attr_filter.value){
          return check_value != null;
        }
        // [size>100]
        else if(operator_function){
          return operator_function.apply(null, [check_value, attr_filter.value]);
        }
        // no operator function found
        else{
          return false;
        }
      })

      if(!all_attributes_passed){
        return false;
      }

    }

    // if we get here then the container has passed all the tests!!!
    return true;
  }
}

function search(selector, context){

  var selector_filter = compile(selector);

  var search_in = context;

  // we must now turn the search_from container into a flat array of the things to actually search

  // direct child mode
  if(selector.splitter=='>'){
    search_in = context.children();
  }
  // direct parent mode
  else if(selector.splitter=='<'){
    throw new Error('we do not support the parent splitter at the moment');
  }
  // all descendents mode
  else{
    search_in = context.descendents();
  }

  // now we loop each child container piping it via the selector filter
  return search_in.filter(selector_filter);
}
});

require.define("/lib/utils.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/
var _ = require('lodash');
var url = require('url');
var uuid = require('node-uuid');

var utils = module.exports = {};

/**
 * generate a new global id
 */

utils.quarryid = function(){
  return uuid.v1();
}

utils.littleid = function(){

  var pattern = 'xxxxxx';
  
  return pattern.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/**
 * takes a string and prepares it to be used in a RegExp itself
 */

utils.escapeRegexp = function(search){
  return search.replace(/([\!\$\(\)\*\+\.\/\:\=\?\[\\\]\^\{\|\}])/g, "\\$1");
}

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

utils.escape = function(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api private
 */

utils.parseUrl = function(req){
  var parsed = req._parsedUrl;
  if (parsed && parsed.href == req.url) {
    return parsed;
  } else {
    return req._parsedUrl = url.parse(req.url);
  }
};

/*

  make a route - optionally replace the '/'s with delimeter
  
*/
utils.makeroute = function(parts, delimeter){
  var route = _.filter(parts || [], function(part){
    return part!=null;
  }).join('/');

  if(delimeter){
    route = route.replace(/\//g, delimeter);
    if(route.indexOf(delimeter)==0){
      route = route.substr(1);
    }
  }

  return route;
}



/**
 * jQuery Deep extend
 */

utils.extend = extend;

function extend(){
  var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = false,
    toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    push = Array.prototype.push,
    slice = Array.prototype.slice,
    trim = String.prototype.trim,
    indexOf = Array.prototype.indexOf,
    class2type = {
      "[object Boolean]": "boolean",
      "[object Number]": "number",
      "[object String]": "string",
      "[object Function]": "function",
      "[object Array]": "array",
      "[object Date]": "date",
      "[object RegExp]": "regexp",
      "[object Object]": "object"
    },
    jQuery = {
      isFunction: function (obj) {
        return jQuery.type(obj) === "function"
      },
      isArray: Array.isArray ||
      function (obj) {
        return jQuery.type(obj) === "array"
      },
      isWindow: function (obj) {
        return obj != null && obj == obj.window
      },
      isNumeric: function (obj) {
        return !isNaN(parseFloat(obj)) && isFinite(obj)
      },
      type: function (obj) {
        return obj == null ? String(obj) : class2type[toString.call(obj)] || "object"
      },
      isPlainObject: function (obj) {
        if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
          return false
        }
        try {
          if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
            return false
          }
        } catch (e) {
          return false
        }
        var key;
        for (key in obj) {}
        return key === undefined || hasOwn.call(obj, key)
      }
    };
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }
  if (typeof target !== "object" && !jQuery.isFunction(target)) {
    target = {}
  }
  if (length === i) {
    target = this;
    --i;
  }
  for (i; i < length; i++) {
    if ((options = arguments[i]) != null) {
      for (name in options) {
        src = target[name];
        copy = options[name];
        if (target === copy) {
          continue
        }
        if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false;
            clone = src && jQuery.isArray(src) ? src : []
          } else {
            clone = src && jQuery.isPlainObject(src) ? src : {};
          }
          // WARNING: RECURSION
          target[name] = extend(deep, clone, copy);
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }
  return target;
}

});

require.define("url",function(require,module,exports,__dirname,__filename,process,global){var punycode = { encode : function (s) { return s } };

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

function arrayIndexOf(array, subject) {
    for (var i = 0, j = array.length; i < j; i++) {
        if(array[i] == subject) return i;
    }
    return -1;
}

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]+$/,
    // RFC 2396: characters reserved for delimiting URLs.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],
    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '~', '[', ']', '`'].concat(delims),
    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''],
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#']
      .concat(unwise).concat(autoEscape),
    nonAuthChars = ['/', '@', '?', '#'].concat(delims),
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,
    hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always have a path component.
    pathedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var out = {},
      rest = url;

  // cut off any delimiters.
  // This is to support parse stuff like "<http://foo.com>"
  for (var i = 0, l = rest.length; i < l; i++) {
    if (arrayIndexOf(delims, rest.charAt(i)) === -1) break;
  }
  if (i !== 0) rest = rest.substr(i);


  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    out.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.

    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the first @ sign, unless some non-auth character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    var atSign = arrayIndexOf(rest, '@');
    if (atSign !== -1) {
      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        var index = arrayIndexOf(rest, nonAuthChars[i]);
        if (index !== -1 && index < atSign) {
          // not a valid auth.  Something like http://foo.com/bar@baz/
          hasAuth = false;
          break;
        }
      }
      if (hasAuth) {
        // pluck off the auth portion.
        out.auth = rest.substr(0, atSign);
        rest = rest.substr(atSign + 1);
      }
    }

    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = arrayIndexOf(rest, nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }

    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out port.
    var p = parseHost(out.host);
    var keys = objectKeys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';

    // validate a little.
    if (out.hostname.length > hostnameMaxLen) {
      out.hostname = '';
    } else {
      var hostparts = out.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            out.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    // hostnames are always lower case.
    out.hostname = out.hostname.toLowerCase();

    // IDNA Support: Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    var domainArray = out.hostname.split('.');
    var newOut = [];
    for (var i = 0; i < domainArray.length; ++i) {
      var s = domainArray[i];
      newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
          'xn--' + punycode.encode(s) : s);
    }
    out.hostname = newOut.join('.');

    out.host = (out.hostname || '') +
        ((out.port) ? ':' + out.port : '');
    out.href += out.host;
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }

    // Now make sure that delims never appear in a url.
    var chop = rest.length;
    for (var i = 0, l = delims.length; i < l; i++) {
      var c = arrayIndexOf(rest, delims[i]);
      if (c !== -1) {
        chop = Math.min(c, chop);
      }
    }
    rest = rest.substr(0, chop);
  }


  // chop off from the tail first.
  var hash = arrayIndexOf(rest, '#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = arrayIndexOf(rest, '?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.search = '';
    out.query = {};
  }
  if (rest) out.pathname = rest;
  if (slashedProtocol[proto] &&
      out.hostname && !out.pathname) {
    out.pathname = '/';
  }

  //to support http.request
  if (out.pathname || out.search) {
    out.path = (out.pathname ? out.pathname : '') +
               (out.search ? out.search : '');
  }

  // finally, reconstruct the href based on what has been validated.
  out.href = urlFormat(out);
  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var auth = obj.auth || '';
  if (auth) {
    auth = auth.split('@').join('%40');
    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
      var nAC = nonAuthChars[i];
      auth = auth.split(nAC).join(encodeURIComponent(nAC));
    }
    auth += '@';
  }

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? auth + obj.host :
          obj.hostname !== undefined ? (
              auth + obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      query = obj.query &&
              ((typeof obj.query === 'object' &&
                objectKeys(obj.query).length) ?
                 querystring.stringify(obj.query) :
                 '') || '',
      search = obj.search || (query && ('?' + query)) || '',
      hash = obj.hash || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') {
    source.href = urlFormat(source);
    return source;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[relative.protocol] &&
        relative.hostname && !relative.pathname) {
      relative.path = relative.pathname = '/';
    }
    relative.href = urlFormat(relative);
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      relative.href = urlFormat(relative);
      return relative;
    }
    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    source.auth = relative.auth;
    source.hostname = relative.hostname || relative.host;
    source.port = relative.port;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.slashes = source.slashes || relative.slashes;
    source.href = urlFormat(source);
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;
    if (relative.protocol) {
      delete relative.hostname;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : source.hostname;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.hostname = source.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                       source.host.split('@') : false;
      if (authInHost) {
        source.auth = authInHost.shift();
        source.host = source.hostname = authInHost.shift();
      }
    }
    source.search = relative.search;
    source.query = relative.query;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.href = urlFormat(source);
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    //to support http.request
    if (!source.search) {
      source.path = '/' + source.search;
    } else {
      delete source.path;
    }
    source.href = urlFormat(source);
    return source;
  }
  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.hostname = source.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                     source.host.split('@') : false;
    if (authInHost) {
      source.auth = authInHost.shift();
      source.host = source.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');
  //to support request.http
  if (source.pathname !== undefined || source.search !== undefined) {
    source.path = (source.pathname ? source.pathname : '') +
                  (source.search ? source.search : '');
  }
  source.auth = relative.auth || source.auth;
  source.slashes = source.slashes || relative.slashes;
  source.href = urlFormat(source);
  return source;
}

function parseHost(host) {
  var out = {};
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

});

require.define("querystring",function(require,module,exports,__dirname,__filename,process,global){var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    };

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}


/*!
 * querystring
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.3.1';

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Cache non-integer test regexp.
 */

var notint = /[^0-9]/;

/**
 * Parse the given query `str`, returning an object.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};

  function promote(parent, key) {
    if (parent[key].length == 0) return parent[key] = {};
    var t = {};
    for (var i in parent[key]) t[i] = parent[key][i];
    parent[key] = t;
    return t;
  }

  return String(str)
    .split('&')
    .reduce(function(ret, pair){
      try{ 
        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
      } catch(e) {
        // ignore
      }

      var eql = pair.indexOf('=')
        , brace = lastBraceInKey(pair)
        , key = pair.substr(0, brace || eql)
        , val = pair.substr(brace || eql, pair.length)
        , val = val.substr(val.indexOf('=') + 1, val.length)
        , parent = ret;

      // ?foo
      if ('' == key) key = pair, val = '';

      // nested
      if (~key.indexOf(']')) {
        var parts = key.split('[')
          , len = parts.length
          , last = len - 1;

        function parse(parts, parent, key) {
          var part = parts.shift();

          // end
          if (!part) {
            if (isArray(parent[key])) {
              parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
              parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
              parent[key] = val;
            } else {
              parent[key] = [parent[key], val];
            }
          // array
          } else {
            obj = parent[key] = parent[key] || [];
            if (']' == part) {
              if (isArray(obj)) {
                if ('' != val) obj.push(val);
              } else if ('object' == typeof obj) {
                obj[objectKeys(obj).length] = val;
              } else {
                obj = parent[key] = [parent[key], val];
              }
            // prop
            } else if (~part.indexOf(']')) {
              part = part.substr(0, part.length - 1);
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            // key
            } else {
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            }
          }
        }

        parse(parts, parent, 'base');
      // optimize
      } else {
        if (notint.test(key) && isArray(parent.base)) {
          var t = {};
          for(var k in parent.base) t[k] = parent.base[k];
          parent.base = t;
        }
        set(parent.base, key, val);
      }

      return ret;
    }, {base: {}}).base;
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix;
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[]'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;
  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  }
  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

});

require.define("/node_modules/node-uuid/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./uuid.js"}
});

require.define("/node_modules/node-uuid/uuid.js",function(require,module,exports,__dirname,__filename,process,global){//     uuid.js
//
//     (c) 2010-2012 Robert Kieffer
//     MIT License
//     https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(require) == 'function') {
    try {
      var _rb = require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (_global.define && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}());

});

require.define("crypto",function(require,module,exports,__dirname,__filename,process,global){module.exports = require("crypto-browserify")
});

require.define("/node_modules/crypto-browserify/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/node_modules/crypto-browserify/index.js",function(require,module,exports,__dirname,__filename,process,global){var sha = require('./sha')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: {
    hex: sha.hex_sha1,
    binary: sha.b64_sha1,
    ascii: sha.str_sha1
  },
  md5: {
    hex: md5.hex_md5,
    binary: md5.b64_md5,
    ascii: md5.any_md5
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) {
  alg = alg || 'sha1'
  if(!algorithms[alg])
    error('algorithm:', alg, 'is not yet supported')
  var s = ''
  var _alg = algorithms[alg]
  return {
    update: function (data) {
      s += data
      return this
    },
    digest: function (enc) {
      enc = enc || 'binary'
      var fn
      if(!(fn = _alg[enc]))
        error('encoding:', enc , 'is not yet supported for algorithm', alg)
      var r = fn(s)
      s = null //not meant to use the hash after you've called digest.
      return r
    }
  }
}

exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, rng(size));
    } catch (err) { callback(err); }
  } else {
    return rng(size);
  }
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
;['createCredentials'
, 'createHmac'
, 'createCypher'
, 'createCypheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDeffieHellman'
, 'pbkdf2'].forEach(function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

});

require.define("/node_modules/crypto-browserify/sha.js",function(require,module,exports,__dirname,__filename,process,global){/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

exports.hex_sha1 = hex_sha1;
exports.b64_sha1 = b64_sha1;
exports.str_sha1 = str_sha1;
exports.hex_hmac_sha1 = hex_hmac_sha1;
exports.b64_hmac_sha1 = b64_hmac_sha1;
exports.str_hmac_sha1 = str_hmac_sha1;

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}


});

require.define("/node_modules/crypto-browserify/rng.js",function(require,module,exports,__dirname,__filename,process,global){// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  // currently only available in webkit-based browsers.
  if (_global.crypto && crypto.getRandomValues) {
    var _rnds = new Uint32Array(4);
    whatwgRNG = function(size) {
      var bytes = new Array(size);
      crypto.getRandomValues(_rnds);

      for (var c = 0 ; c < size; c++) {
        bytes[c] = _rnds[c >> 2] >>> ((c & 0x03) * 8) & 0xff;
      }
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())
});

require.define("/node_modules/crypto-browserify/md5.js",function(require,module,exports,__dirname,__filename,process,global){/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}


exports.hex_md5 = hex_md5;
exports.b64_md5 = b64_md5;
exports.any_md5 = any_md5;

});

require.define("/lib/contract.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');

var Contract = require('./contract/proto');
var Request = require('./contract/request');
var Response = require('./contract/response');

/*
  Quarry.io - Network
  -------------------

  


 */

module.exports = {
  factory:factory,
  request:request,
  response:response
}

function factory(type){
  var ret = new Contract();
  type && ret.setType(type);
  return ret;
}

function request(data){
  return new Request(data);
}

function response(data){
  return Response.factory(data);
}
});

require.define("/lib/contract/proto.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');
var util = require('util');
var utils = require('../utils');
var Request = require('./request');
var Response = require('./response');

/*
  Quarry.io - Contract
  --------------------

  A promise based object that acts as the bridge between a container
  and it's API and the low level REST requests that are sent to the network

  The contract is returned from the following container methods:

    selector
    append
    save
    delete

  The 'ship' method acts as a common trigger for a contract (i.e. send it)

  A contract can also be combined into a larger one for piping and merging together

 */

module.exports = Contract;

function Contract(data){
  Request.apply(this, [data]);
  this.setHeader('content-type', 'quarry/contract');
  this.setHeader('x-contract-id', utils.quarryid());
  this.setType('merge');
  this.method = 'post';
  this.body = [];
}

util.inherits(Contract, Request);

/*

  trigger the network request
  
*/
Contract.prototype.ship = function(fn){
  var self = this;

  var res = Response.factory(function(){
    
    if(res.body==null){
      throw new Error('null response was sent');
      return;
    }

    self.emit('ship', res);

    var answer = self.map_response(res);
    fn && fn.apply(answer, [answer]);
  })
  
  self.supplychain && self.supplychain(self, res, function(){
    res.send404();
  })

  return this;
}

/*

  a function triggered for every step of the contract resolving
  
*/
Contract.prototype.trace = function(fn){
  this.debug(true);
  this.setHeader('x-quarry-trace', true);
}

/*

  merge or pipe
  
*/
Contract.prototype.setType = function(type){
  this.setHeader('x-contract-type', type);
  return this;
}

/*

  add a request/other contract to the sequence
  
*/
Contract.prototype.add = function(req){
  this.body.push(_.isFunction(req.toJSON) ? req.toJSON() : req);
  return this;
}

/*

  turn the response into the context needed
  
*/
Contract.prototype.map_response = function(res){
  return res;
}
});

require.define("util",function(require,module,exports,__dirname,__filename,process,global){var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

});

require.define("/lib/contract/request.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var util = require('util');
var Message = require('./message');
var url = require('url');

var utils = require('../utils');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Request;


function Request(data){
  data || (data = {});
  Message.apply(this, [data]);
  this.path = data.path || '/';
  this.method = data.method || 'get';
  this.query = data.query || {};
  if(this.path.indexOf('?')>=0){
    _.extend(this.query, url.parse(this.path, true).query);
    this.path = this.path.split('?')[0];
  }
}

util.inherits(Request, Message);

Request.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.path = this.path;
  ret.method = this.method;
  ret.query = this.query;

  return ret;
}

Request.prototype.isContract = function(){
  return this.getHeaer('content-type')=='quarry/contract';
}

Request.prototype.summary = function(){
  return this.method.toUpperCase() + ' ' + this.path + ' ' + (this.getHeader('content-type') ? this.getHeader('content-type') : '');
}

Request.prototype.skeleton = function(){
  return {
    path:this.path,
    method:this.method,
    query:this.query
  }
}

Request.prototype.debug = function(activate){

  if(arguments.length>0){
    this.setHeader('x-quarry-debug', arguments[0]);
    return this;
  }
  else{
    return this.getHeader('x-quarry-debug')==true;  
  }
}

Request.prototype.inject = function(req){
  req.setHeader('x-quarry-debug', this.getHeader('x-quarry-debug'));
}

Request.prototype.getcontractheader = function(){
  return {
    contractid:this.getHeader('x-contract-id'),
    contenttype:this.getHeader('content-type'),
    method:this.method,
    path:this.path
  }
}
});

require.define("/lib/contract/message.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var _ = require('lodash');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var utils = require('../utils');
/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Message;

function Message(data){
  data || (data = {});
  EventEmitter.call(this);
  this.headers = data.headers || {};
  this.body = data.body || null;
  this.headerSent = false;
}

util.inherits(Message, EventEmitter);

Message.prototype.toJSON = function(){
  return {
    headers:this.headers,
    body:this.body
  }
}

Message.prototype.quarryid = function(){
  return this.getHeader('x-quarry-id');
}

/*

  copied mostly from node.js/lib/http.js
  
*/
Message.prototype.setHeader = function(name, value) {
  if (arguments.length < 2) {
    throw new Error('`name` and `value` are required for setHeader().');
  }

  if (this.headerSent) {
    throw new Error('Can\'t set headers after they are sent.');
  }

  var key = name.toLowerCase();
  this.headers = this.headers || {};
  this.headers[key] = value;
  return this;
}


Message.prototype.getHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for getHeader().');
  }

  if (!this.headers) return;

  var key = name.toLowerCase();
  var value = this.headers[key];

  if(!value){
    return value;
  }

  if(name.indexOf('x-json')==0 && _.isString(value)){
    value = this.headers[key] = JSON.parse(value);
  }
  
  return value;
}


Message.prototype.removeHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for removeHeader().');
  }

  if (this.headerSent) {
    throw new Error('Can\'t remove headers after they are sent.');
  }

  if (!this.headers) return;

  var key = name.toLowerCase();
  delete this.headers[key];
}
});

require.define("/lib/contract/response.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var util = require('util');
var Message = require('./message');
var _ = require('lodash');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Response;

function Response(data){
  Message.apply(this, [data]);
  this.statusCode = data ? data.statusCode : null;
}

Response.factory = function(data){

  /*
  
    sort out the constructor so you can quickly
    create responses with the callback hooked up
    
  */
  var fn = null;

  if(_.isFunction(data)){
    fn = data;
    data = null;
  }

  var ret = new Response(data);

  if(fn){
    ret.on('send', function(){
      fn(null, ret);
    })
  }

  return ret;
}

util.inherits(Response, Message);

Response.prototype.statusCode = 200;

Response.prototype.fill = function(data){
  _.extend(this, _.isString(data) ? JSON.parse(data) : data);
  this.send();
}

Response.prototype.send = function(body){
  arguments.length>0 && (this.body = body);
  this.emit('beforesend');
  this.emit('send');
  this.headerSent = true;
  return this;
}

Response.prototype.containers = function(body){
  this.setHeader('content-type', 'quarry/containers');
  this.body = body;
  return this;
}

Response.prototype.json = function(body){
  this.setHeader('content-type', 'application/json');
  this.body = body;
  return this;
}

Response.prototype.send404 = function(){
  this.statusCode = 404;
  return this.send('resource not found');
}

Response.prototype.error = function(body){
  this.statusCode = 500;
  return this.send(body);
}

Response.prototype.hasError = function(){
  return this.statusCode==500 || this.statusCode==404;
}

Response.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.statusCode = this.statusCode;

  return ret;
}

/*

  grabs an array of responses from either multipart or single
  
*/
Response.prototype.flatten = function(){
  return this.isMultipart() ? _.map(this.body, function(resdata){
    return new Response(resdata);
  }) : [this];
}

Response.prototype.isContainers = function(){
  return this.getHeader('content-type')=='quarry/containers';
}

Response.prototype.isMultipart = function(){
  return this.getHeader('content-type')=='quarry/multipart';
}

Response.prototype.http_content_type = function(){
  var ret = this.getHeader('content-type') || 'text/html';
  return ret.indexOf('quarry/')>=0 ? 'application/json' : ret;
}

/*

  turns the response into a multipart container for lots of responses

*/
Response.prototype.multipart = function(arr){
  this.setHeader('content-type', 'quarry/multipart');
  this.body = arr ? arr : [];
  this.send();
}

Response.prototype.add = function(res){
  this.setHeader('content-type', 'quarry/multipart');
  if(!this.body){
    this.body = [];
  }
  this.body.push(res.toJSON());
}

Response.prototype.summary = function(){
  return this.statusCode + ' ' + (this.hasError() ? this.body : this.getHeader('content-type'));
}

/*

  send a quarry response via a HTTP response
  
*/
Response.prototype.httpsend = function(res){
  
  /*
  
    all quarry content-types are JSON
    
  */
  _.each(this.headers, function(val, key){
    res.setHeader(key, val);
  })
  res.setHeader('content-type', this.http_content_type());
  res.send(this.body);

}
});

require.define("/lib/portal/wrapper.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/
var _ = require('lodash');
var Portal = require('./proto');
var EventEmitter = require('events').EventEmitter;

module.exports = {
  portal:portal,
  radio:radio
}

/*

  quarry.io - portal wrapper

  knows how to wrap an array of portals as one


 */
function portal(container){

  var ret = {};

  var portals = container.map(function(c){
    var portal = new Portal();
    portal.attachcontainer(c);
    /*
    
      attach events here
      
    */
    return portal;
  })

  function factory(method){
    return function(){
      var args = _.toArray(arguments);
      _.each(portals, function(portal){
        portal[method].apply(portal, args);
      })
      return this;
    }
  }
  _.each([
    'appended',
    'saved',
    'deleted',
    'sync',
    'raw',
    'broadcastinstruction',
    'radio',
    'close'
  ], function(method){
    ret[method] = factory(method);
  })

  _.extend(ret, EventEmitter.prototype);

  return ret;
}

function radio(container){

  var ret = {};

  var radios = container.map(function(c){
    var portal = new Portal();
    portal.attachcontainer(c);
    return portal.radio();
    /*
    
      attach events here
      
    */
  })

  function factory(method){
    return function(){
      var args = _.toArray(arguments);
      _.each(radios, function(radio){
        radio[method].apply(radio, args);
      })
      return this;
    }
  }
  _.each([
    'listen',
    'talk',
    'close'
  ], function(method){
    ret[method] = factory(method);
  })

  _.extend(ret, EventEmitter.prototype);

  return ret;
}
});

require.define("/lib/portal/proto.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var inspectselect = require('inspectselect');
var Router = require('../container/router');
var _ = require('lodash');
var Message = require('./message');
var Radio = require('./radio');

module.exports = Portal;

/*

  quarry.io - portal

  a wrapper representing events broadcast and subsrcibed for
  a container within a stack

  it manages the subscription keys via the routes property of the
  container's meta data

  supplier.portal.method

  
*/

function Portal(){
  EventEmitter.call(this);

  /*
  
    a register a portal routes against callbacks
    
  */
  this.stack = {};
  this.depthmode = false;
}

util.inherits(Portal, EventEmitter);

/*

  attach this portal onto a switchboard client
  
*/
Portal.prototype.attachcontainer = function(container){

  this.container = container;
  this.spawn = _.bind(container.spawn, container);
  this.switchboard = container.get_switchboard();
  this.router = Router(container.skeleton());
}

/*

  attach a skeleton and a switchboard client
  
*/
Portal.prototype.attach = function(skeleton, switchboard){
  this.skeleton = skeleton;
  switchboard && (this.switchboard = switchboard);
  this.router = Router(this.skeleton);
}

function processselector(selector, handler){
  var deepmode = false;
  if(selector){
    var parsed = inspectselect(selector);
    selector = parsed[0][0];
    deepmode = selector.splitter!='>';
    delete(selector.splitter);

    /*
    
      check we have a way of making containers without referencing the container back (circular deps)
      
    */
    var orighandler = handler;
    handler = function(message){
      orighandler(message, selector);
    }
  }

  handler.deepmode = deepmode;

  return handler;
}

function targetportal(httpmethod){

  return function(selector, fn){
    var self = this;

    if(!fn){
      fn = selector;
      selector = null;
    }

    if(!this.spawn){
      throw new Error('saved cannot run added without a spawn function');
    }

    var handler = processselector(selector, function(message, selector){
      
      var target = message.get_target();

      if(!selector){
        fn(message.body, target);
        return;
      }
      else if(target.match(selector)){
        fn(message.body, target);
        return; 
      }
    })

    this._register(httpmethod, handler);
  }
}

function containerportal(httpmethod){

  return function(selector, fn){

    var self = this;

    if(!fn){
      fn = selector;
      selector = null;
    }

    if(!this.spawn){
      throw new Error('appended cannot run added without a spawn function');
    }

    var handler = processselector(selector, function(message, selector){
      
      var containers = message.get_containers();
      var target = message.get_target();

      if(!selector){
        fn(containers);
        return;
      }
      else{
        if(handler.deepmode){
          containers = containers.descendents();
        }

        var results = containers.filter(selector);
        results.count()>0 && fn(results, target);
      }
    })

    this._register(httpmethod, handler);

    return this;
  }
}

Portal.prototype.appended = containerportal('post');

Portal.prototype.saved = targetportal('put');

Portal.prototype.deleted = targetportal('delete');

var syncmethods = {
  post:function(container, message){
    
    var messagetarget = message.get_target();
    var messagecontainers = message.get_containers();

    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){

      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      /*
      
        if there are no targets loaded then return
        
      */
      if(containertarget.count()>0){
        containertarget.append(messagecontainers);
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        container.append(messagecontainers);
      }
    }
    
  },
  put:function(container, message){
    var messagetarget = message.get_target();
    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){



      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      /*
      
        if there are no targets loaded then return
        
      */
      if(containertarget.count()>0){
        containertarget.inject(message.body);
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        container.inject(message.body);
      }
    }
  },
  delete:function(container, message){
    var messagetarget = message.get_target();

    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){

      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      if(containertarget.count()>0){
        if(containertarget.parent){
          containertarget.parent.removechildren(messagetarget);
        }
        else{
          containertarget.remove(messagetarget);
        }
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        if(container.parent){
          container.parent.removechildren(messagetarget);
        }
        else{
          container.remove(messagetarget);
        }
      }
    }
  }
}
/*

  if the portal is linked to a container this will keep the local data in
  line with all deep changes
  
*/
Portal.prototype.sync = function(){
  var self = this;
  if(!this.container){
    return this;
  }

  var deepmode = false;
  var callback = null;

  if(arguments.length==1){
    if(_.isBoolean(arguments[0])){
      deepmode = arguments[0];
    }
    else if(_.isFunction(arguments[0])){
      callback = arguments[0];
    }
  }
  else if(arguments.length==2){
    deepmode = arguments[0];
    callback = arguments[1];
  }

  this.raw(deepmode, function(message){
    message.deepmode = deepmode;
    syncmethods[message.method] && syncmethods[message.method].apply(self, [self.container, message]);
    callback && callback(message, self.container);
  })

  return this;
}

Portal.prototype.raw = function(deepmode, fn){
  if(!fn){
    fn = deepmode;
    deepmode = false;
  }

  fn.deepmode = deepmode;

  this._register('*', fn);

  return this;
}

Portal.prototype.close = function(){
  var self = this;
  _.each(self.stack, function(route){
    _.each(self.stack[route], function(fn){
      self.switchboard.cancel(route, fn);
    })
  })
  this.stack = {};
  return this;
}

/*

  internal method as a proxy onto the actual switchboard
  
*/
Portal.prototype._register = function(httpmethod, fn){
  var self = this;

  var usemethod = httpmethod && httpmethod!='*';

  var routermethod = (fn.deepmode ? 'deep' : 'shallow') + (usemethod ? 'method' : '');
  var route = self.router[routermethod].apply(self.router, [httpmethod]);

  self._listen(route, function(messagedata){
    var message = new Message(messagedata, self.spawn);

    fn(message);
  })

  return this;
}

Portal.prototype.run_stack = function(route, message){
  var self = this;
  _.each(this.stack[route], function(fn){
    fn && fn(message);
  })
}

Portal.prototype._listen = function(route, fn){
  return this._prependlisten('portal:/', route, fn);
}

/*

  allows different protocols over the switchboard (like radio for instance)
  
*/
Portal.prototype._prependlisten = function(prepend, route, fn){
  var self = this;
  if(this.switchboard){
    if(!this.stack[route]){
      this.stack[route] = [fn];
      this.switchboard.listen(prepend + route, function(message){
        self.run_stack(route, message);
      })
    }
    else{
      this.stack[route].push(fn);
    }
  }
  return this;
}

/*

  
*/
Portal.prototype._broadcast = function(route, message){
  return this._prependbroadcast('portal:/', route, message);
}

/*

  allows different protocols over the switchboard (like radio for instance)
  
*/
Portal.prototype._prependbroadcast = function(prepend, route, message){
  var self = this;
  if(this.switchboard){
    this.switchboard.broadcast.apply(this.switchboard, [prepend + route, message]);
  }
  return this;
}
/*

  we have 4 routes:

    generic shallow:

      supplier.quarryid

    generic deep:

      supplier.a.b.c.d

    method shallow:

      method.supplier.quarryid

    method deep:

      method.supplier.a.b.c.d

  
*/
Portal.prototype.broadcastinstruction = function(instruction){
  var self = this;

  var doneroutes = {};

  _.each(['shallow', 'deep', 'shallowmethod', 'deepmethod'], function(routermode){

    var route = self.router[routermode].apply(self.router, [instruction.method]);

    if(!doneroutes[route]){
      doneroutes[route] = true;
      self._broadcast(route, instruction);
    }
  })

}

Portal.prototype.radio = function(){
  return new Radio(this);
}
});

require.define("/lib/container/router.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var utils = require('../utils');
var Info = require('./info');

module.exports = router;

/*

  quarry.io - router

  functions for working out different strings representing a container on the network

  every container came from a supplier
  this is stamped by the supplier on the way out
  the supplier is saved in:

    meta.quarrysupplier (e.g. /database/user34/4545)

  every container also has a quarryid
  therefore we can do REQREP operations using:

    /database/user34/4545/435345345345345

  as a direct route into any container regardless of where it lives inside the supplier

  then there are portal routes

  these are based on a materialized path representing the route in the container tree

  this is used for portals that listen 'into' points in a container tree

  the materialized path for a container can be anything the supplier decides

  for example - the QuarryDB uses an array of positions - that is the 3rd thing, in the 4th thing, in the 1st thing

  filesystems could use the filepath as the materialized path

  suppliers don't need to worry about uniqueness outside of one database
  that is handled because the path is combined with the supplier route for portals



  
*/

function router(skeleton){
  if(!skeleton){
    return {};
  }

  var info = Info(skeleton);

  return {
    link:function(){
      return {
        quarryid:skeleton.quarryid,
        quarrysupplier:skeleton.quarrysupplier
      }
    },
    links:function(){
      return info.links;
    },
    rpclinks:function(){
      return _.map(this.links(), function(link){
        return utils.makeroute([link, info.containerpath]);  
      })
    },
    quarrysupplier:function(){
      return info.quarrysupplier;
    },
    method:function(method, mode){
      if(!mode){
        mode = 'shallow';
      }
      return this[mode + 'method'].apply(this, [method]);
    },
    shallowmethod:function(method){
      return utils.makeroute([method, this.shallow()], '.');
    },
    deepmethod:function(method){
      return utils.makeroute([method, this.deep()], '.');
    },
    rpc:function(){
      return utils.makeroute([skeleton.quarrysupplier, info.containerpath]);
    },
    shallow:function(){
      return utils.makeroute([skeleton.quarrysupplier, info.containerpath], '.');
    },
    deep:function(){
      return utils.makeroute([skeleton.quarrysupplier].concat(info.portalparts || []), '.');
    }
  }
}
});

require.define("/lib/container/info.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var utils = require('../utils');

module.exports = info;

/*

  quarry.io - meta

  a function that returns an analysis of a container skeleton (it's meta data)

  this is used across the system to resolve things like __supplychain tagnames and wotnot



  
*/
function info(skeleton){
  var root = skeleton.supplychainroot==true;
  return {
    databaseroot:root,
    quarrysupplier:skeleton.quarrysupplier,
    quarryid:skeleton.quarryid,
    quarryportal:skeleton.quarryportal,
    containerpath:root ? null : skeleton.quarryid,
    portalparts:root ? null : skeleton.quarryportal,
    links:skeleton.links
  }
}
});

require.define("/lib/portal/message.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

module.exports = Message;

/*

  quarry.io - portal message

  the messages that arrive via a portal - hooked up with
  the targets and meta

  you pass the raw content of the message and a spawn
  function that will produce containers from data

  
*/

function Message(content, spawn){
  EventEmitter.call(this);

  _.extend(this, content || {});
  this.content = content;
  this.spawn = spawn;
}

util.inherits(Message, EventEmitter);

Message.prototype.get_containers = function(){
  var data = this.headers['content-type']=='quarry/containers' ? this.content.body : [];

  return this.spawn(data);
}

Message.prototype.get_target = function(){
  var data = this.target ? [{
    meta:this.target
  }] : [];

  return this.spawn(data);
}

Message.prototype.get_update = function(){
  var data = this.headers['content-type']=='quarry/update' ? data : [];

  return this.spawn(data);
}

Message.prototype.toJSON = function(){
  return this.content;
}
});

require.define("/lib/portal/radio.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var _ = require('lodash');
var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var Message = require('./message');

module.exports = Radio;

/*

  quarry.io - radio

  a radio is a way of sending messages amoungst containers
  that are not HTTP methods on the supplier but transient
  events - perfect for real-time comms

  a server-side container supplier can listen to their own
  radios and decide to save the data if they want

  in fact - how server-side containers (i.e. suppliers) deal
  with radio messages is up to the events hash of the container

  (^^^ this is how the bots work)

  
*/

function Radio(portal){
  EventEmitter.call(this);

  /*
  
    a register a portal routes against callbacks
    
  */
  this.portal = portal;
}

util.inherits(Radio, EventEmitter);

Radio.prototype._router = function(routingkey){
  var parts = [this.portal.router.shallow()];

  if(routingkey){
    parts.push(routingkey);
  }

  return parts.join('.');
}

Radio.prototype.close = function(){
  this.portal.close();
  return this;
}

/*

  listen in on container events
  
*/
Radio.prototype.listen = function(routingkey, fn){

  var self = this;
  if(!fn){
    fn = routingkey;
    routingkey = '';
  }

  if(_.isFunction(fn)){
    if(routingkey!=''){
      var origfn = fn;
      fn = function(message){
        origfn(message.data);
      }
    }
    else{
      var origfn = fn;
      fn = function(message){
        origfn(message.data, message.route);
      } 
    }
    this.portal._prependlisten('radio:/', this._router(routingkey), fn);
  }
  else if(_.isObject(fn)){
    _.each(fn, function(f, routingkey){
      self.listen(routingkey, f);
    })
  }

  return this;  
}

/*

  speak something
  
*/
Radio.prototype.talk = function(routingkey, data){

  if(!data){
    data = routingkey;
    routingkey = '';
  }

  this.portal._prependbroadcast('radio:/', this._router(routingkey), {
    route:routingkey,
    data:data
  })

  return this;
}
});

require.define("/lib/container/link.js",function(require,module,exports,__dirname,__filename,process,global){/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/**
 * Module dependencies.
 */

var utils = require('../utils');

module.exports = link;

/*

  quarry.io - link

  generates link data that can be appended or assigned to another
  containers children or attributes

  the link is basicallly a very reduced skeleton of the target
  as attributes with a __symlink tagname

  
*/
function link(router){

  return {
    meta:{
      tagname:'__symlink'
    },
    attr:router.link()
  }
}
});
