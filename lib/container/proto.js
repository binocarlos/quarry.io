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

var _ = require('lodash');

var EventEmitter = require('events').EventEmitter;
var deepdot = require('deepdot');

var XML = require('./xml');
var utils = require('../utils');

var Container = module.exports = function(){}

Container.prototype.__proto__ = EventEmitter.prototype;

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
  data = _.map(data || [], function(model){
    model.meta || (model.meta = {});
    model.meta.quarryid || (model.meta.quarryid = utils.quarryid());
    return model;
  })

  this.models = data;

  /*
  
    handler is the supplychain we use to fulfill contracts

    invariably - this is connected back to a warehouse or reception somewhere
    
  */
  this.handler = null;
}

/*

  return a copy of the models - for network transmission mostly
  
*/
Container.prototype.toJSON = function(){
  return JSON.parse(JSON.stringify(this.models));
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

  return a new container with the given data

  the container is hooked up to the same supply chains as the spawner
  
*/
Container.prototype.spawn = function(models){
  if(!_.isArray(models)){
    models = [models];
  }
  var ret = container_constructor(models);
  ret.handler = this.handler;
  return ret;
}

/*

  add the models from the given container into this model array
  
*/
Container.prototype.add = function(container){
  var self = this;
  this.models = this.models.concat(Container.prototype.models);
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
Container.prototype.containermap = function(){
  var map = {};
  _.each(this.containers(), function(container){
    map[Container.prototype.quarryid()] = container;
  })
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
  var all_models = [];
  _.each(this.models, function(model){
    all_models = all_models.concat(model.getChildren());
  })
  return this.spawn(all_models);
}

/*

  recurse over children and self
  
*/
Container.prototype.recurse = function(fn){
  this.descendents().each(fn);
  return this;
}

// return a flat array of all descendents including this level
Container.prototype.descendents = function(){
  var all_models = [];
  function find_model(model){
    all_models.push(model);
    _.each(model.children, find_model);
  }
  _.each(this.models, find_model);
  return this.spawn(all_models);
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
function wrapper(key){
  return function(){
    var self = this;

    /*
    
      wholesale getter of the object
      
    */
    if(arguments.length<=0){
      return deepdot(this.models[0], key);
    }
    /*
    
      we are reading a first model value

    */
    else if(arguments.length==1 && _.isString(arguments[0])){
      return deepdot(this.models[0], [key, arguments[0]].join('.'));
    }
    /*
    
      we are setting an object
      
    */
    else if(arguments.length==1 && _.isObject(arguments[0])){
      _.each(this.models, function(model){
        deepdot(model, key, arguments[0]);
      })
      return self;
    }
    /*
    
      we are setting a string value
      
    */
    else if(arguments.length>1){
      _.each(this.models, function(model){
        deepdot(model, [key, arguments[0]].join('.'), arguments[1]);
      })
      return self;
    }
  }
  
}

Container.prototype.attr = wrapper('attr');
Container.prototype.meta = wrapper('meta');

Container.prototype.id = wrapper('meta.id');
Container.prototype.quarryid = wrapper('meta.quarryid');
Container.prototype.tagname = wrapper('meta.tagname');
Container.prototype.classnames = wrapper('meta.classnames');

Container.prototype.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.unique((deepdot(model, 'meta.classnames') || []).concat(classname));
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.without((deepdot(model, 'meta.classnames') || []), classname);
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

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Network Interface
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.handle = function(){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('handling!');
}