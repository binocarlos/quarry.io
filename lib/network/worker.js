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

var NameServer = require('./nameserver');

/*

  quarry.io - worker proto

  a process that can virtually host webservers and stackservers

  this lets us deploy stacks efficiently across our physical hardware

  there are 2 stages of allocation

  1. the network decides how many workers each stack gets
  stack workers are physically seperated as different processes

  2. the stack then decides how to allocate it's services across
  it's workers

  3. each time a stack 'allocates' a service - it decides which worker
  to issue the service to

  4. the worker process will create a portal to itself in the database

  5. to boot services we add them to the worker in the database
  and the portal does the rest

  6. when a worker boots a service - it is also emitted to the db to keep track

  
*/

module.exports = Worker;

/*

  skeleton network config
  
*/
var defaultconfig = {
  name:"quarry.io Worker",
  stack_id:'system'
}

function Worker(options){
  EventEmitter.call(this);
  this.initialize(options);
  this.nameserver = new NameServer();
}

util.inherits(Worker, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Worker.prototype.initialize = function(options){
  var self = this;

  extend(this, defaultconfig, options || {});

  return this;
}