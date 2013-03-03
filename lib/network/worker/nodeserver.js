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
var extend = require('xtend');

var eyes = require('eyes');
var _ = require('lodash');

var log = require('logule').init(module, 'Worker');
var Node = require('../node');

/*

  quarry.io - worker node server

  a wraper for node's having been sparked onto a worker

  
*/

module.exports = NodeServer;

/*

  skeleton network config
  
*/

function NodeServer(options){
  EventEmitter.call(this);

  this.options = options || {};

  /*
  
    a map of the node objects we have running
    
  */
  this.sparks = {};
}

util.inherits(NodeServer, EventEmitter);

/*

  the database has added service to this worker

  we have got the node via a portal
  
*/
NodeServer.prototype.add = function(nodecontainer, sparkcontainer, callback){
  var self = this;

  /*
  
    create the node - this is the actual code for the service
    
  */
  var spark = Node({
    db:this.db,
    node:nodecontainer,
    spark:sparkcontainer,
    worker:this.options,
    flavour:this.options.flavour
  })

  this.sparks[sparkcontainer.quarryid()] = spark;

  /*
  
    trigger the node
    
  */
  spark.boot(callback);

  return this;
}