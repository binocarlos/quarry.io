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
var os = require('os');
var Container = require('../../container');

var log = require('logule').init(module, 'Infrastructure');

/*

  quarry.io - infrastructure

  this looks after getting a network to actually boot

  this can happen in 3 ways:

    development:
      bootloader:in process
      nameserver:IPC
      infrastructure:localhost

    local:
      bootloader:worker
      nameserver:TCP
      infrastructure:localhost

    cloud:
      bootloader:worker
      nameserver:TCP
      infrastructure:cloudserver

  each of the following methods are run in the context of a stack

  the physical seperation between stacks is important

  it happens on the actual wire with ZeroMQ routing keys

    allocate
      decide on which instance in the infrastructure a worker will live on

    resolve
      get the network connection details for where a worker lives
      this is used to build supply chains around the network

    deploy
      load the code representing a service and hook up the supply chains
      to the rest of the stack

  
*/

module.exports = Infrastructure;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function Infrastructure(systemconfig){
  var self = this;
  EventEmitter.call(this);
  this.initialize(systemconfig);
}

util.inherits(Infrastructure, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
Infrastructure.prototype.initialize = function(systemconfig){
  var self = this;
  this.systemconfig = systemconfig;
}

Infrastructure.prototype.httpendpoint = function(worker){

  var port = systemconfig.attr('httpport');
  port++;
  systemconfig.attr('httpport', port);
  return {
    hostname:worker.attr('instance.hostname'),
    port:port
  }
}

Infrastructure.prototype.get_layout = function(){

  var layout = Container.new('infrastructure');

  log.info('building layout');

  /*
  
    build and add the localhost to the infrastructure
    
  */
  var localhost = Container.new('instance', {
    name:'localhost',
    hostname:'127.0.0.1',
    cpus:os.cpus().length
  }).id('localhost').addClass('master')

  layout.append(localhost);
  
  return layout;
}

Infrastructure.prototype.assign_database = function(db){
  this.db = db;
  return this;
}

Infrastructure.prototype.prepare = function(callback){
  throw new Error('abstract');  
}

/*

  get the address for a generic service
  
*/
Infrastructure.prototype.rpcendpoint = function(stack, service, type, instance){
  throw new Error('abstract');
}

/*

  get the address for a worker service
  
*/
Infrastructure.prototype.workerendpoint = function(worker, name){
  throw new Error('abstract');
}

/*

  produce some instances for a stack to run on
  
*/
Infrastructure.prototype.allocate = function(config, callback){
  throw new Error('abstract');
}

/*

  this puts workers onto instances
  
*/
Infrastructure.prototype.deploy = function(stack, worker, callback){
  throw new Error('abstract');
}

/*

  this boots the network HTTP router
  
*/
Infrastructure.prototype.networkdeploy = function(flavour, callback){
  throw new Error('abstract');
}

/*

  copy the code for a stack onto a worker that is designated for it
  
*/
Infrastructure.prototype.copystackcode = function(worker, stack, callback){
  throw new Error('abstract');
}

/*

  make sure the code for a stack is locally availble to load and get the path for it
  
*/
Infrastructure.prototype.ensurestackcode = function(stack, callback){
  throw new Error('abstract');
}