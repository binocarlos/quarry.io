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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var _ = require('lodash');
var path = require('path');

var Device = require('../device');
var log = require('logule').init(module, 'Node');


/*

  quarry.io - node proto

  a node is a network device that is configured to connect and run code

  
*/

module.exports = Node;

/*

  skeleton network config
  
*/

function Node(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Node, EventEmitter);

Node.prototype.initialize = function(options){
  _.extend(this, options);
  this.options = options;
  return this;
}

Node.prototype.boot = function(callback){
  callback();
}

Node.prototype.codepath = function(codepath){

  if(!codepath){
    return this.options.worker.stack.codefolder;
  }
  
  codepath = codepath.replace(/^\//, '');
  return path.resolve(this.options.worker.stack.codefolder, codepath);
}

/*

  network nodes (like the router) are not booted via workers
  so they need their own system client factory
  
*/
Node.prototype.bootsystem = function(callback){
  var self = this;
  var systemclient = Device('system.client');

  var database = self.options.system.database;

  /*
  
    connect to the system so we get a reference to our container within the system db
    
  */
  systemclient.connect(database.endpoints, function(db){

    callback(null, db);
    
  })
}