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
var utils = require('./utils');
var Backbone = require('./vendor/backbone');
var baseFactory = require('./container/base');
var Container = require('./container');
var reducerFactory = require('./warehouse/reducer');
var eyes = require('eyes');

module.exports = Warehouse;

/*
  Quarry.io - Warehouse
  ---------------------

  The main co-ordinating class for dealing with packets

  The warehouse is basically a router for supply chains

  It presents a middleware stack

  You add middleware based on a route - the packet.route is used

  The middleware is a

    function(req, res, next)

  It does not think about the packet

  the request and response are hooked up by the warehouse

  The warehouse will have supply chains associated with it which packets can be routed to


 */

/*
  The warehouse itself is a function that triggers the middleware stack
 */
function Warehouse(options){
  this.initialize(options);
  _.extend(this, Backbone.Events);
}


/*
  To tell apart from containers in the container factory
 */
Warehouse.prototype.is_warehouse = true;

/*
  The normal default container model
 */
Warehouse.prototype.initialize = function(options){

  options || (options = {});

  this.options = options;

  this._route = {
    protocol:options.protocol || 'quarry',
    hostname:options.hostname || 'warehouse' + utils.quarryid(true),
    resource:options.resource || 'default'
  }

  // this middleware stack for this warehouse
  // each method will match on the route & path
  this.stack = {
    before:[],
    main:[],
    after:[]
  }

  // how many things are we waiting for
  this.waitingcount = 0;

  // the array of functions to run when we are ready
  this.ready_callback_stack = [];

  // we register events against the containers we have produced
  // this lets us come out of object into serialized state and for
  // the event handlers to be reistered
  //
  // this object is a map of handlers by container id
  this.events = {};

  this._models = {};

  // this will set the .base_model
  this.models(options.models);

  /*
    The reducers works through contracts

   */
  this.reducer = reducerFactory(this);
}

/*


  READY





 */



Warehouse.prototype.id = function(){
  return arguments.length>0 ? this._id = arguments[0] : this._id;
}

Warehouse.prototype.route = function(){
  return arguments.length>0 ? this._route = arguments[0] : this._route;
}

Warehouse.prototype.protocol = function(){
  return arguments.length>0 ? this._route.protocol = arguments[0] : this._route.protocol;
}

Warehouse.prototype.hostname = function(){
  return arguments.length>0 ? this._route.hostname = arguments[0] : this._route.hostname;
}

Warehouse.prototype.resource = function(){
  return arguments.length>0 ? this._route.resource = arguments[0] : this._route.resource;
}

/*
  

  Container Factory


 */

/*
  The class we are using for our container models

  The container model is a base class that points into:

    attr model
    meta model
    data model
    children collection
 */

Warehouse.prototype.models = function(models){
  models || (models = {});
  this._models = _.extend(this._models, models);
  this.base_model = baseFactory(this._models);
  return this;
}

Warehouse.prototype.model = function(model){
  this.models({
    attr:model
  })
  return this;
}

Warehouse.prototype.metamodel = function(model){
  this.models({
    meta:model
  })
  return this;
}

/*
  return a new MODEL
 */
Warehouse.prototype.model_factory = function(raw_data){

  // are we already a model?
  if(raw_data && raw_data._is_container_model){
    return raw_data;
  }

  return new this.base_model(raw_data);
}


/*
  return a new CONTAINER
 */
Warehouse.prototype.new = function(){


  var args = _.toArray(arguments).concat(this);

  if(args.length<=1){
    args = [{
      _meta:{}
    }, args[0]]
  }

  return Container.apply(null, args);
}


/*


  STACK





 */

/*

  return a supply chain (req, res, next)

 */


Warehouse.prototype.use = function(path, fn){
  return this.add_to_stack('main', path, fn);
}

Warehouse.prototype.before = function(path, fn){
  return this.add_to_stack('before', path, fn); 
}

Warehouse.prototype.after = function(path, fn){
  return this.add_to_stack('after', path, fn); 
}

Warehouse.prototype.get_full_stack = function(){
  var before = this.stack.before || [];
  var main = this.stack.main || [];
  var after = this.stack.after || [];

  var full = before.concat(main, after);

  return full;
}

Warehouse.prototype.run = function(packet, main_callback){

  var self = this;
  var before = this.stack.before || [];
  var main = this.stack.main || [];
  var after = this.stack.after || [];

  function packeterror(){
    throw new Error('You cannot call packet methods in before/after functions')
  }

  function main_stack(finished){
    self.run_stack(main, packet, function(){
      finished();
    })
  }

  function simple_stack(stack){
    // setup the async blocks
    return function(finished){

      packet.route = packeterror;
      packet.res.send = packeterror;
      packet.res.error = packeterror;

      async.forEachSeries(stack, function(fn, next){

        // this means they have given a next in the function
        // we let them control the flow
        if(fn.length>1){
          fn.apply(self, [packet, function(){
            next();
          }]);
        }
        else{
          fn.apply(self, [packet]);
          next();
        }
        
      }, function(){
        finished();
      })
    }
  }

  var full_stack = [];

  if(before.length>0){
    full_stack.push(simple_stack(before));
  }

  full_stack.push(main_stack);

  if(after.length>0){
    full_stack.push(simple_stack(after));
  }

  async.series(full_stack, function(){
    main_callback(packet);
  })

  //this.run_stack(this.get_full_stack(), packet, main_callback);
}


/*

  add a middleware function to the warehouse stack

 */
Warehouse.prototype.add_to_stack = function(stack_name, path, fn){
  var self = this;

  if(arguments.length<=0){
    return this;
  }
  else if(!fn){
    fn = path;
    path = null;
  }

  function pathmatch(route, path){
    return route==path;
  }

  if(_.isArray(path)){
    _.each(path, function(ipath){
      self.add_to_stack(stack_name, ipath, fn);
    })
    return this;
  }

  if(fn.is_warehouse){
    fn = fn.supplychain();
  }

  if(path){
    var orig_fn = fn;

    // we assume fn(packet, next)
    if(orig_fn.length>1){
      fn = function(packet, next){
        if(pathmatch(path, packet.path())){
          orig_fn(packet, next);
        }
        else{
          next();
        }
      }  
    }
    else{
      fn = function(packet){
        if(pathmatch(path, packet.path())){
          orig_fn(packet);
        }
      }
    }
  }

  self.register_supplychain(fn);

  this.stack[stack_name] || (this.stack[stack_name] = {});
  this.stack[stack_name].push(fn);
  
  return this;
}


/*

  run a packet through the middleware stack
  we setup the methods on the packet

 */
Warehouse.prototype.run_stack = function(stack, packet, main_callback){

  var self = this;
  var packet_sent = false;

  if(!main_callback){
    throw new Error('the warehouse needs a main callback to run a stack')
  }

  // copy the stack for this run
  //var current_stack = [].concat(this.stack[stack_name]);
  var current_stack = [].concat(stack);

  function carry_on_with_stack(){
    return !packet_sent && current_stack.length>0;
  }

  packet.res.send = function(content){
    packet_sent = true;
    packet.res.body(content);
    main_callback(packet);
  }

  packet.res.error = function(error){
    packet_sent = true;
    packet.error(error);
    main_callback(packet);
  }

  function not_found(){
    packet.res.error('404');
  }

  /*
    Jump in for the contract resolving
   */
  if(packet.path() && packet.path().match(/^\/contract/)){
    self.reducer(packet, not_found);
  }
  else{
    // run through the stack until there is
    async.whilst(carry_on_with_stack, function(next){

      var next_stack = current_stack.shift();      
      next_stack.apply(self, [packet, next]);

    }, not_found)
  }
}

Warehouse.prototype.supplychain = function(){
  var self = this;

  var supplychain = function(packet, next){

    function run_packet(){
      self.run(packet.clone(), function(result_packet){
        packet.res.send(result_packet.res.body());
      })  
    }
    
    self.ready(run_packet);
  }
  supplychain.ready = _.bind(self.ready, self);
  supplychain.warehouseready = _.bind(self.warehouseready, self);
  
  supplychain._isbroadcaster = true;
  supplychain.on = _.bind(this.on, this);
  supplychain.off = _.bind(this.off, this);
  supplychain.trigger = _.bind(this.trigger, this);

  return supplychain;
}

Warehouse.prototype.broadcast = function(message){
  this.trigger('broadcast', message);
}

Warehouse.prototype.register_supplychain = function(fn){

  var self = this;

  // lets see if our supply chain has a broadcaster we hook onto
  if(fn._isbroadcaster){
    fn.on('broadcast', function(message){
      self.trigger('broadcast', message);
    })
  }
  this.wait_for_supplychain(fn);
}

Warehouse.prototype.wait_for_supplychain = function(fn){
  var self = this;
  if(!fn.ready){
    return;
  }

  self.wait();

  fn.ready(function(){
    self.waitover();
  })
}

Warehouse.prototype.wait = function(){
  this.waitingcount++;
  return this;
}

Warehouse.prototype.waitover = function(){
  this.waitingcount--;

  if(this.waitingcount<=0){
    this.waitingcount = 0;
    this.triggerready();
  }
}

Warehouse.prototype.triggerready = function(){
  var self = this;
  _.each(self.ready_callback_stack, function(ready_fn){
    ready_fn.apply(self, []);
  })
}

Warehouse.prototype.ready = function(callback){

  var self = this;

  function run_ready_callback(){
    // make the container pointing to here
    var warehouse_container = Container({

    }, self)
      .quarryid('warehouse')
      .tagname('warehouse')

    warehouse_container.route(this._route)
      
    callback(warehouse_container);
  }
  
  if(this.waitingcount>0){
    this.ready_callback_stack.push(run_ready_callback);
  }
  else{
    run_ready_callback();
  }

  return this;
}

Warehouse.prototype.warehouseready = function(callback){

  var self = this;

  function run_ready_callback(){      
    callback(self);
  }
  
  if(this.waitingcount>0){
    this.ready_callback_stack.push(run_ready_callback);
  }
  else{
    run_ready_callback();
  }

  return this;
}

/*
  Used to output the raw data results from this warehouse
  We take skeleton and tree options and also stamp our route

 */
Warehouse.prototype.process_results = function(results, options){
  var self = this;
  options || (options = {});
  var skeleton = options.skeleton ? true : false;
  var tree = options.tree ? true : false;

  function inject_route(raw_data){
    if(!raw_data._route){
      raw_data._route = self.route();
    }

    return raw_data;
  }

  function process_data(raw_data){
    if(skeleton){
      return {
        '_route':raw_data._route || {},
        '_meta':raw_data._meta || {}
      }
    }
    var ret = _.clone(raw_data);
    if(!tree){
      delete(ret._children);
    }
    return ret;
  }

  return _.map(_.map(results.toJSON(), process_data), inject_route);
}

/*


  EVENTS





 */

Warehouse.prototype.bind = function(id, event, callback){
  this.events[id] || (this.events[id] = {});
  this.events[id][event] || (this.events[id][event] = []);
  this.events[id][event].push(callback);
  return this;
}

Warehouse.prototype.trigger = function(){
  var args = _.toArray(arguments);
  var id = args.shift();
  var event = args.shift();
  var cbs = this.events[id][event];
  _.each(cbs, function(cb){
    cb.apply(null, args);
  })
}

Warehouse.prototype.unbind = function(id, event, callback){
  if(!this.events[id]){
    return this;
  }
  if(!callback){
    delete(this.events[id][event]);
    return this;
  }
  else{
    this.events[id][event] = _.filter(this.events[id][event], function(cb){
      return cb!==callback;
    })
    return this;
  }
}

Warehouse.prototype.unbind_all = function(id){
  delete(this.events[id]);
  return this;
}

/*
  

  Internals


 */


/*
  Are we running in the browser?
 */
Warehouse.prototype.serverside = typeof window === 'undefined';