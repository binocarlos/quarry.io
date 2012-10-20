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
var Backbone = require('./vendor/backbone');
var Base = require('./container/base');
var Contract = require('./warehouse/contract');
var Container = require('./container');

module.exports = factory;

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

function factory(supply_chain){

  // default is loopback
  supply_chain || (supply_chain = function(packet, callback){
    callback(null, packet);
  })

  var warehouse = function(packet, callback){
    supply_chain(packet, callback);
  }

  _.extend(warehouse, Warehouse.prototype);

  warehouse.initialize(supply_chain);

  return warehouse;
}

var Warehouse = {};

Warehouse.prototype = {};

/*
  The normal default container model
 */
Warehouse.prototype.initialize = function(supply_chain){

  // this middleware stack for this warehouse
  // each method will match on the route & path
  this.stack = [];

  // we register events against the containers we have produced
  // this lets us come out of object into serialized state and for
  // the event handlers to be reistered
  //
  // this object is a map of handlers by container id
  this.events = {};

  this.supply_chain = supply_chain || function(packet, callback){
    callback(null, packet);
  }

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
}


/*
  The normal default container model
 */
Warehouse.prototype.container_model = Base;

/*
  A function that can generate containers from the self contained model class
 */
Warehouse.prototype.container_factory = function(raw_data){
  return new this.container_model(raw_data);
}


/*
  Are we running in the browser?
 */
Warehouse.prototype.serverside = typeof window === 'undefined';

/*

 */
Warehouse.prototype.new = function(){
  var args = _.toArray(arguments).concat(this);

  return Container.apply(null, args);
}

/*
  run a packet through the middleware stack
 */

/*
  add a middleware function to the warehouse stack
 */
Warehouse.prototype.use = function(){
  var args = _.toArray(arguments);
  if(args.length==1 && _.isFunction(args[0])){
    this.stack.push({
      route:null,
      fn:args[0]
    })
  }
  else if(args.length==2 && _.isString(args[0]) && _.isFunction(args[1])){
    this.stack.push({
      route:args[0],
      fn:args[1]
    })
  }

  return this;
}

/*
  register event handlers for one container
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