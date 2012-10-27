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
var Base = require('./container/base');
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

  First we nerf the default Backbone sync to go nowhere

 */

Backbone.sync = function(method, model, options){

  // nerfed
}

/*
  The warehouse itself is a function that triggers the middleware stack
 */
function Warehouse(options){
  this.initialize(options);
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

  this._hostname = options.hostname || 'warehouse' + utils.quarryid(true);
  this._protocol = options.protocol || 'quarry';

  // this middleware stack for this warehouse
  // each method will match on the route & path
  this.stack = [];

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

  /*
    
   */
  this.container_model = Base.extend({

    /*
      The overridden sync method that speaks to our supply chain
     */
    sync:function(method, model, options){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('BACBONE SYNC');
      console.log(method);
      console.log(model);
      console.log(options);
    }
  })


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

Warehouse.prototype.protocol = function(){
  return arguments.length>0 ? this._protocol = arguments[0] : this._protocol;
}

Warehouse.prototype.hostname = function(){
  return arguments.length>0 ? this._hostname = arguments[0] : this._hostname;
}

/*
  

  Container Factory


 */

/*
  The normal default container model
 */
Warehouse.prototype.container_model = Base;

/*
  A function that can generate containers from the self contained model class
 */
Warehouse.prototype.container_factory = function(raw_data){
  if(raw_data && raw_data.is_container_model){
    return raw_data;
  }
  return new this.container_model(raw_data);
}


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

/*

  add a middleware function to the warehouse stack

 */
Warehouse.prototype.use = function(path, fn){

  var self = this;

  if(arguments.length<=0){
    return this;
  }
  else if(arguments.length==1){
    fn = path;
    path = null;
  }

  if(fn.is_warehouse){
    fn = fn.supplychain();
  }

  if(path){
    var orig_fn = fn;

    fn = function(packet, next){
      if(packet.path()==path){
        orig_fn(packet, next);
      }
      else{
        next();
      }
    }  
  }

  self.wait_for_supplychain(fn);

  this.stack.push(fn);
  
  return this;
}



/*

  run a packet through the middleware stack
  we setup the methods on the packet

 */
Warehouse.prototype.run = function(packet, main_callback){

  var self = this;
  var packet_sent = false;

  if(!main_callback){
    throw new Error('test')
  }

  // copy the stack for this run
  var current_stack = [].concat(this.stack);

  function carry_on_with_stack(){
    return !packet_sent && current_stack.length>0;
  }

  /*
    Used to send the packet down a supply chain
    Flag the packet as sent because otherwise the reducer will kick in
   */
  packet.route = function(supply_chain){
    packet_sent = true;
    supply_chain(this, main_callback);
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
    self.run(packet.clone(), function(result_packet){
      packet.res.send(result_packet.res.body());
    })
  }
  supplychain.ready = _.bind(self.ready, self);
  return supplychain;
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
      .hostname(self.hostname())
      .protocol(self.protocol())

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

/*


  EVENTS





 */

Warehouse.prototype.bind = function(id, event, callback){
  console.log('-------------------------------------------');
  console.log('BIND');
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