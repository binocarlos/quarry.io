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
var queries = require('../query/factory');
var Transaction = require('../query/transaction');
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
  this.switchboards = [];
  this.errors = [];
  this.configure(options);
  this.models = dataextractor(args, self.basemodel);
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
  var ret = factory([], this.options);
  ret.models = _.isArray(models) ? models : (models ? [models] : []);
  // pass on the models & stack
  ret.stack = this.stack;
  ret.switchboards = this.switchboards;
  return ret;
}

Container.results = function(){
  var ret = factory(_.toArray(arguments), this.options);
  // pass on the models & stack
  ret.stack = this.stack;
  ret.switchboards = this.switchboards;
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

Container.count = function(){
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

// return an array of single model containers
Container.containers = function(){
  var self = this;
  return _.map(this.models, function(model){
    return self.spawn(model);
  })
}

Container.containermap = function(){
  var map = {};
  _.each(this.containers(), function(container){
    map[container.quarryid()] = container;
  })
  return map;
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
  var containers = _.filter(this.containers(), fn);
  var models = _.map(containers, function(container){
    return container.get(0);
  })
  return this.spawn(models);
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

Container.frequency = helpers.fn('frequency');
Container.route = helpers.fn('route');

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
  Portals
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*
  
  Add the given portal function to the warehouse that produced these containers

 */
Container.portal = function(fn){
  var self = this;
  _.each(self.containers(), function(container){
    _.each(self.switchboards, function(switchboard){
      var frequency = container.frequency();
      switchboard.listen('container', frequency, function(message){
        fn && fn.apply(self, [message]);
      })
    })
  })
  return this;
}

Container.removePortal = function(fn){
  var self = this;
  _.each(self.containers(), function(container){
    _.each(self.switchboards, function(switchboard){
      var frequency = container.frequency();
      switchboard.remove('container', frequency, fn);
    })
  })
  return this;
}

Container.removePortals = function(){
  var self = this;
  _.each(self.containers(), function(container){
    _.each(self.switchboards, function(switchboard){
      var frequency = container.frequency();
      switchboard.removeAll('container', frequency);
    })
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
  if ('function' == typeof fn.switchboard) {
    this.switchboards.push(fn.switchboard);
  }
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
  var finalres = queries.response(callback);
  async.forEach(this.stack, function(fn, complete){
    var res = queries.response(function(res){
      finalres.addResponse(res);
      complete();
    })
    fn(req, res);
  }, function(){
    finalres.send();
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

/*

  Wrap a given query up with the shipping promise

 */
Container.ship_query = function(req){
  var self = this;
  req.ship = function(fn){
    self.handle(req, function(res){
      
      var answers = _.map(res.body(), function(resjson){
        return queries.resfromJSON(resjson);
      })

      var results = [];
      var errors = [];
      
      _.each(answers, function(res){
        if(res.hasError()){
          errors.push({
            status:res.status(),
            body:res.body()
          })
        }
        else{
          results = results.concat(res.body());
        }
      })
      
      var results_container = self.results(results);
      var error_strings = _.map(errors, function(error){
        return error.status + ': ' + error.body;
      })
 
      fn(results_container, error_strings);
    })
  }

  return req;
}

// prepare a contract that has a branch for each model in this container
Container.run_selector = function(){
  var self = this;

  // getRoutes(true) because we are selecting into
  var req = queries.selector(this.getRoutes(true), _.toArray(arguments).reverse());

  return this.ship_query(req);
}

Container.request = function(path, options){
  if(!options){
    options = path;
    path = null;
  }
  else{
    options.path = path;
  }

  var req = queries.request(options);

  return this.ship_query(req);
}

Container.alter_children = function(children, remove){
  var self = this;
  if(_.isArray(children)){
    _.each(children, function(child){
      self.alter_children(child, remove);
    })
    return this;
  }
  else{
    _.each(this.models, function(model){
      if(remove){
        model.remove(children.models);
      }
      else{
       model.append(children.models); 
      }
    })
    return this;
  }
}

// add the children onto the children of each model
// if a callback is given it means we want it to happen to the database too
Container.append = function(children, callback){

  var self = this;

  // we are running in local mode
  if(!callback){
    this.alter_children(children);
  }
  // we are running in network mode
  else{
    function extract_data(container){
      return container.toJSON();
    }

    if(!_.isArray(children)){
      children = [children];
    }

    // prepare the raw data we are appending
    var raw = [];
    _.each(children, function(child){
      var addraw = child.toJSON();
      if(addraw){
        raw = raw.concat(addraw);
      }
    })

    this.alter_children(children);

    function portal(message){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('PORTAL');
      eyes.inspect(message);
    }

    self.portal(portal);

    var transaction = new Transaction({
      handle:_.bind(self.handle, self),
      rollback:function(res){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('error from transaction: rollback');
        self.alter_children(children, true);
      },
      commit:function(res){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('transaction committed');
        
      }
    })

    // getRoutes(true) because we are appending
    // this means the routes will be whatever the containers point to
    var req = queries.append(this.getRoutes(true), raw);

    transaction.run(req);
    
  }

  return this;

}
