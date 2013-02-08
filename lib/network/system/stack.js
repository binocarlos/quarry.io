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

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var extend = require('xtend');
var log = require('logule').init(module, 'Stack');
var dye = require('dye');

var Warehouse = require('../../warehouse');
var Container = require('../../container');

var Node = require('../node');

/*

  quarry.io - stack proto

  A stack is a combination of webserver and stackserver to provide
  a full set of web applications

  It lives on a network - seperated from other stacks

  The front end HTTP load balancer knows which domains to route to
  which stack gateway

  The stack gateway provides both HTTP and RPC entrypoints

  It internally works out which node to route the HTTP or RPC request to

  
*/

module.exports = Stack;

var defaultoptions = require('./config.json');
var workerflavours = ['webserver', 'reception', 'apiserver'];

function Stack(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Stack, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Stack.prototype.initialize = function(options){
  var self = this;
  options || (options = {});

  /*
  
    setup the skeleton stack options
    
  */

  this.options = extend({}, defaultoptions, options);
  this.id = this.options.config.id;

  this.workerfolders = {};
  this.configfolders = {};

  /*
  
    this will be set to the system db
    
  */
  this.db = null;
}

/*

  the initial appending of the stack layout to the 'stacks' folder
  of the network system

*/
Stack.prototype.get_layout = function(){

  var options = this.options;

  /*
  
    first build up the stack layout
    
  */
  var root = Container.new('stack', options.config).id(this.id);

  _.each(workerflavours, function(flavour){

    var flavouroptions = options[flavour];

    var config = Container.new('config', flavouroptions.config).addClass(flavour);
    var workers = Container.new('workers').addClass(flavour)

    _.each(flavouroptions.stack, function(stack){
      var service = Container.new('service', stack).addClass(flavour);
      config.append(service);
    })

    root.append([config, workers]);
  })

  return root;
}

Stack.prototype.build_endpoints = function(root){

  var endpoints = this.options.apiserver.stack;

  return Container.new(_.map(endpoints, function(endpoint){
    return {
      meta:{
        tagname:'endpoint'
      },
      attr:websitedata
    }
  }))
}

Stack.prototype.build_websites = function(root){

  var websites = this.options.webserver.virtualhosts;
  /*
  
    append each website to the webserver
    
   */
  return Container.new(_.map(websites, function(websitedata){
    websitedata.stack_root = root.attr('stackfolder');
    return {
      meta:{
        tagname:'website'
      },
      attr:websitedata
    }
  }))
}

/*

  expose the root toJSON
  
*/

Stack.prototype.toJSON = function(){
  return this.root ? this.root.toJSON() : {};
}

/*

  upload the stack to the database
  stackcontainer is the generic 'stacks' node to append to
  
*/
Stack.prototype.upload = function(container, callback){

  var self = this;

  var layout = this.get_layout();

  log.info('uploading: ' + dye.green(this.id));

  container
    .append(layout)
    .ship(function(){

      self.db = layout;      

      callback();
    })
}



/*

  we are given 3 sets of instances for us to built out our workers

    core
    web
    api
  
*/
Stack.prototype.allocate = function(allocation, callback){

  var self = this;

  /*
  
    allocation is a container full of the instances we are allowed to boot
    workers on (as provided by the infrastructure)

    we can emit events on the allocation for the infrastructure to create more
    
  */
  self.allocation = allocation;

  async.series([

    /*
    
      first get the workers built
      
    */
    function(next){

      async.forEachSeries(self.allocation.build_workers(), _.bind(self.spark_worker, self), next);

    },

    /*
    
      boot the receptions first
      
    */
    function(next){

      self.spark_nodes(next);
      
    },

    /*
    
      finally tell the network we are ready
      
    */
    function(next){
      self.emit('ready');
      next();
    }
  ], callback)
  
}

Stack.prototype.spark_worker = function(config, callback){
  var worker = this.create_worker(coinfc)
}

/*

  workers are the logical seperation of a stack

  one worker can be deployed onto multiple instances

  the nameserver maps a service name onto one of the instances + the stack allocation (via the deployment)

  this function creates the initial basic workers before they might request any scaling

  the instances upon which to boot each worker are passed in by the infrastructure
  
*/
Stack.prototype.create_worker = function(config, callback){

  var self = this;
  log.info('create_worker: ' + config.flavour);

  /*
  
    make the worker
    
  */
  
  var worker = Container.new('worker')
    .addClass(config.flavour)
    .attr({
      name:this.id + ' ' + config.flavour + ' worker',
      stackid:this.id,
      flavour:config.flavour,
      heartbeat:self.workers.attr('heartbeat'),
      monitor:self.workers.attr('monitor'),
      instance: _.extend({
        id:config.instance.quarryid()
      },config.instance.attr())
        
    })

  self.db('workers.' + config.flavour).ship(function(workers){
    console.log('-------------------------------------------');
    console.log('have workers folder');

    /*
  
      now append it to the database and get it booted
      
    */

    workers.append(worker).ship(function(){
      
      log.info('worker added: ' + worker.summary());

      self.boot_worker(worker, callback);
    })
  })
  

}

/*

  get the deployment to boot our worker and tell us when it's ready
  for adding stuff to it via the db
  
*/
Stack.prototype.boot_worker = function(worker, callback){
  var self = this;
  
  this.allocation.deploy_worker({
    stackid:this.id,
    workerid:worker.quarryid()
  }, function(){
    
    log.info('worker booted: ' + worker.summary());

    /*
    
      setup the radio connection to the worker for heartbeats and wot not
      
    */

    worker
      .radio()
      .listen('heartbeat', function(counter){

      })
      .listen('monitor', function(data){
        
      })

    callback();
    
  })
  
}

/*

  the initial spark to get nodes appended to workers
  
*/
Stack.prototype.spark_nodes = function(callback){
  var self = this;

  async.forEachSeries(workerflavours, function(flavour, nextflavour){
    log.info('booting ' + flavour + ' nodes');



  }, callback)
  

  /*
  
    get every worker that has been allocated to reception and boot a reception
    node onto it
    
  */
  async.forEach(this.workers.find('.reception').containers(), function(receptionworker, nextworker){

    var nodeconfig = _.extend({}, self.reception.attr(), {
      flavour:'reception',
      endpoints:Node.endpoints.reception(receptionworker, self.allocation.workerendpoint)
    })

    self.spark_node(receptionworker, nodeconfig, nextworker);

  }, callback);

}

/*

  spark a reception node by adding the service to a worker
  
*/
Stack.prototype.spark_node = function(worker, config, callback){
  var self = this;
  log.info('spark node: ' + config.flavour);

  /*
  
    make the worker
    
  */
  var node = Container.new('node')
    .addClass(config.flavour)
    .attr(config)

  worker.append(node).ship(function(){
    log.info('node sparked: ' + config.flavour);
    //callback();
  })

  
}