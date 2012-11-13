/*
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

var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var helpers = require('./helpers');
var dataextractor = require('./dataextractor');
var xml = require('./filters/xml');
var Backbone = require('../vendor/backbone');
var BaseModel = require('./base');
var searcher = require('./search');
var queryFactory = require('../query/factory');

var eyes = require('eyes');

var Container = module.exports = {};

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Factory
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

function factory(args, options){
  function instance(){
    return instance.run_selector.apply(instance, _.toArray(arguments));
  }
  _.extend(instance, Container);
  _.extend(instance, Backbone.Events);
  instance.fill(args, options);
  return instance;
}

Container.factory = factory;

/*
  The base model used for the models array

  This can be overriden to use a different 'attr' model of the users choosing

 */
Container.basemodel = BaseModel;

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Model Array Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

// set the backbone model to use for attr
Container.configure = function(options){
  options || (options = {});
  this.options = options;
  if(options.attrmodel){
    this.basemodel = BaseModel.extend({
      attrmodel:options.attrmodel
    })
  }
  return this;
}

// this is called with the arguments containing the model data
Container.fill = function(args, options){
  var self = this;
  this.stack = [];
  this.errors = [];
  this.configure(options);

  this.models = _.map(dataextractor(args), function(containerdata){
    // if it is a backbone model - lets check if it's attributes or
    // the higher level wrapper
    if(containerdata && containerdata.cid){
      
      // we are already a wrapper model just return
      if(containerdata._is_quarry_wrapper){
        return containerdata;
      }
      else{
        var ret = new self.basemodel();
        ret.attr = containerdata;
        return ret;
      }
      
    }
    else{
      return new self.basemodel(containerdata);
    }
  })
  return this;
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


// return the model at index
Container.get = function(index){
  return this.models[index];
}

// return a single model container at index
Container.eq = function(index){
  return this.spawn(this.models[index]);
}

// make new containers based on the given raw data
// hook up the middleware too
Container.spawn = function(models){

  var ret = factory([models], this.options);

  // pass on the stack
  ret.stack = this.stack;

  return ret;
}

// iterate over single model containers
Container.each = function(fn){
  var self = this;
  _.each(this.models, function(model){
    fn && fn(self.spawn(model));
  })
}

// append models onto this containers model array
Container.add = function(container){
  var self = this;
  _.each(container.models, function(model){
    self.models.push(model);
  })
  return this;
}

// add these models to the array of the target
Container.pourInto = function(target){
  target.add(this);
  return this;
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

// return an array of single model containers
Container.containers = function(fn){
  var self = this;
  return _.map(this.models, function(model){
    return self.spawn(model);
  })
}

// return an array of the raw backbone models inside of the outside model
Container.backbonemodels = function(){
  return _.map(this.models, function(model){
    return model.attr;
  })
}

// return a container with the models that passed the filter
// pass single model containers into the filter
Container.filter = function(fn){
  return this.spawn(_.map(_.filter(this.containers(), fn), function(container){
    return container.get(0);
  }))
}

Container.find = function(){
  return searcher(this, _.toArray(arguments));
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

// return a container merging all model children
Container.children = function(){
  var all_models = [];
  _.each(this.models, function(model){
    all_models = all_models.concat(model.getChildren());
  })
  return this.spawn(all_models);
}

// run a function over each descendent
Container.recurse = function(fn){
  this.descendents().each(fn);
  return this;
}

// return a flat array of all descendents including this level
Container.descendents = function(dev){
  var all_models = [];
  function find_model(model){
    all_models.push(model);
    _.each(model.getChildren(), find_model);
  }
  _.each(this.models, find_model);
  return this.spawn(all_models);
}


/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Data Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.toJSON = function(){
  return _.map(this.models, function(model){
    return model.toJSON();
  })
}

Container.toXML = function(){
  return xml.toXML(this.toJSON());
}

// return just the route for each model
// below means are are going into it
// otherwise we mean the model itself
Container.getRoutes = function(descendent_mode){
  return _.map(this.models, function(model){
    return model.getRoute(descendent_mode);
  })
}

Container.setRoute = function(route){
  _.each(this.models, function(model){
    model.setRoute(route);
  })
  return this;
}

Container.ensureids = function(forsaving){
  this.recurse(function(container){
    _.each(container.models, function(model){
      model.ensureid(forsaving);
    })
  })
  return this;
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
Container.is = function(tagname){
  return this.tagname()==tagname;
}
Container.attr = helpers.model('attr');
Container.meta = helpers.object('meta');

Container.quarryid = helpers.property('meta.quarryid');
Container.tagname = helpers.property('meta.tagname');
Container.id = helpers.property('meta.id');
Container.classnames = helpers.property('meta.classnames');

Container.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    model.addClass(classname);
  })
  return this;
}

Container.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    model.removeClass(classname);
  })
  return this;
}

Container.hasClass = function(classname){
   return this.models.length > 0 && this.get(0).hasClass(classname);
}

Container.hasAttr = function(name){
  return this.models.length > 0 && this.get(0).attr.has(name);
}

Container.removeAttr = function(name){
  _.each(this.models, function(model){
    model.attr.unset(name);
  })
  return this;
}


/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Stack
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

// a basic version of the warehouse middleware stack
// this lets us have containers route to multiple warehouses (funky for later)
Container.use = function(fn){
  // have we been passed a whole warehouse or just a middleware function
  if ('function' == typeof fn.handle) {
    var server = fn;
    fn = function(req, res, next){
      server.handle(req, res, next);
    }
  }
  this.stack.push(fn);
  return this;
}

// run the packet through the stack in parallel - this is the client side stack
Container.handle = function(req, callback){
  var all_results = [];
  var all_errors = [];

  async.forEach(this.stack, function(fn, complete){
    var res = queryFactory.response();
    res.on('send', function(){
      if(res.hasError()){
        all_errors.push(res.toJSON());
      }
      else if(!_.isEmpty(res.body())){
        all_results.push(res.body());
      }
      complete();
    })
    fn(req, res);
  }, function(){
    callback(all_results, all_errors);
  }) 
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Queries
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */


// prepare a contract that has a branch for each model in this container
Container.run_selector = function(){
  var self = this;
  var req = queryFactory.selector(this.getRoutes(true), _.toArray(arguments).reverse());

  req.ship = function(fn){
    self.handle(req, function(results_array, errors_array){
      var results_container = self.spawn(results_array);
      var error_strings = _.map(errors_array, function(error){
        return error.status + ': ' + error.body;
      })

      results_container.errors = function(){
        return error_strings;
      }

      fn(results_container);
    })
  }

  return req;
}

// add the children onto the children of each model
// if a callback is given it means we want it to happen to the database too
Container.append = function(children, callback){
  // we are running in local mode
  if(!callback){
    _.each(this.models, function(model){
      model.append(children.models);
    })
  }
  // we are running in network mode
  else{

  }
}
