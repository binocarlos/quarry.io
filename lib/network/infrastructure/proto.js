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