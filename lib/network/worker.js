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


/*

  quarry.io - worker proto

  a worker is a stub process that lives one per instance

  a worker process is part of the system stack

  it will virtual host the worker processes / handlers
  for stacks

  in both RPC and PUB/SUB cases - the worker sockets are prepended by
  the stack_id

  this is added as part of the frame in RPC and as the routing key in PUB/SUB

  RPC:

    request_id  BLANK  /dbs/apples -> stack_id  BLANK  request_id  BLANK /dbs/apples

  PUB SUB:

    routingkey -> stackid.routingkey




  
*/

module.exports = Worker;

/*

  skeleton network config
  
*/
var defaultconfig = {
  name:"quarry.io Worker"
}

function Worker(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Worker, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Worker.prototype.initialize = function(options){
  var self = this;

  options = extend({}, defaultconfig, options || {});

  return this;
}