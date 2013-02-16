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