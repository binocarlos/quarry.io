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


var Container = require('../container');

var baseconfig = require('../../config.json');

var log = require('logule').init(module, 'Deployment');

/*

  quarry.io - deployment

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

module.exports = Deployment;

/*

  skeleton network config
  
*/
var defaultoptions = {

  prepare:function(callback){

  },
  
  /*
  
    get the ZeroMQ addresses for the system
    
  */
  systemconfig:function(){
    
  },

  /*
  
    get the ZeroMQ address for a network service
    
  */
  networkaddress:function(stack, service, type, instance){
    
  },

  /*
  
    the deployment listens to the system so it can react to events like
    instances being added
    
  */
  systemportal:function(){
    
  },

  /*
  
    calculate the initial workers we will allocate to a stack
    
  */
  allocateworkers:function(stack){

  },

  deployworker:function(worker, callback){

  },

  deploynode:function(worker, node, callback){

  },
  
  /*
  
    react to worker and instance events to manage load
    
  */
  monitor:function(){

  }
  
}

function Deployment(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Deployment, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
Deployment.prototype.initialize = function(options){
  var self = this;

  _.extend(this, defaultoptions, options || {});

  log.info('Deployment ready');
  
  return this;
}