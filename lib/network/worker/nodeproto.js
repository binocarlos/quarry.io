/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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