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
var Container = require('../../container');
var Device = require('../device');
var log = require('logule').init(module, 'Worker');

var Monitor = require('./tools/monitor');
var Heartbeat = require('./tools/heartbeat');
var NodeServer = require('./nodeserver');

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

function Worker(options){
  EventEmitter.call(this);
  options || (options = {});
  this.options = options;
}

util.inherits(Worker, EventEmitter);

Worker.prototype.boot = function(callback){
  var self = this;
  this.system = Device('supplychain.client', self.options.system.database);
  this.system.connect(function(db){

    log.info('Database Connection Ready - loading worker from db');

    /*
    
      get a portal onto the worker that we are so the system
      can communicate with us
      
    */
    db('worker=' + self.options.workerid).ship(function(worker){

      self.container = worker;
      self.portal = worker.portal();
      self.radio = worker.radio();
      self.monitor = Monitor(worker.attr('monitor'));
      self.heartbeat = Heartbeat(worker.attr('heartbeat'));
      
      self.hookup(callback);

    })

  })

}

Worker.prototype.hookup = function(callback){
  var self = this;
  /*
      
    keep the worker and all it's data in sync
    
  */
  this.container.portal()
    /*
    
      when nodes are added - boot them
      
    */
    .appended('> node', _.bind(self.boot_node, self))

  this.heartbeat.on('beat', function(counter){
    self.radio.talk('heartbeat', counter);
  })

  this.monitor.on('data', function(data){
    self.radio.talk('monitor', data);
  })

  this.monitor.start();
  this.heartbeat.start()

  callback();
}

/*

  the database has added service to this worker

  we have got the node via a portal
  
*/
Worker.prototype.boot_node = function(node){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('booting node');
  eyes.inspect(node.toJSON());
  process.exit();
}