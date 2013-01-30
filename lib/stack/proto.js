/*
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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');

var Warehouse = require('../warehouse');
var Container = require('../container');

/*

  quarry.io - stack proto

  A stack is a combination of webserver and stackserver to provide
  a full set of web applications

  It lives on a network - seperated from other stacks

  The front end HTTP load balancer knows which domains to route to
  which stack gateway

  The stack gateway provides both HTTP and RPC entrypoints

  It internally works out which node to route the HTTP or RPC request to

  
*/

module.exports = Stack;

function Stack(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Stack, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Stack.prototype.initialize = function(options){
  var self = this;
  options || (options = {});

  this.root = Container.new('stack', options.attr);
  this.database = Container.new('database', options.database);
  this.api = Container.new('api', options.api.attr);
  this.webserver = Container.new('webserver', options.api.attr);

  this.root.append([this.database, this.api, this.webserver])

  /*
  
    append each endpoint to the API
    
   */
  _.each(options.api.endpoints, function(endpointdata){
    var endpoint = Container.new('endpoint', endpointdata);
    self.api.append(endpoint);
  })

  /*
  
    append each website to the webserver
    
   */
  _.each(options.webserver.virtualhosts, function(websitedata){
    var virtualhost = Container.new('website', websitedata);
    self.webserver.append(virtualhost);
  })

  return this;
}

/*

  expose the root toJSON
  
*/

Stack.prototype.toJSON = function(){
  return this.root ? this.root.toJSON() : {};
}

/*

  create a container that will chuck contracts to our supplychain
  
*/
Stack.prototype.boot = function(fn){
  var container = Container.new('warehouse', this.config ? this.config.attr() : {});
  container.route('normal', this.route || '/');
  container.supplychain = this.supplychain();
  fn && fn(container);
  return this;
}