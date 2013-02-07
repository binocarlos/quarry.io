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

var defaultoptions = {
  attr:{
    name:"quarry.io Stack",
    id:"default"
  },
  workers:{
    attr:{}
  },
  api:{
    attr:{},
    endpoints:[]
  },
  webserver:{
    attr:{},
    virtualhosts:[]
  }
}

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
  this.options = extend({}, this.defaults(), options);
  this.id = this.options.attr.id;
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
  var root = Container.new('stack', options.attr).id(this.id);

  var workers = Container.new('workers', options.workers.attr);
  var api = Container.new('api', options.api.attr);
  var webserver = Container.new('webserver', options.webserver.attr);

  _.each(this.endpoints(), function(endpoint){
    api.append(endpoint);
  })

  _.each(this.websites(), function(website){
    website.attr('stack_root', root.attr('stackfolder'));
    webserver.append(website);
  })

  root.append([workers, api, webserver])

  return root;
}

Stack.prototype.endpoints = function(){

  var endpoints = this.options.api.endpoints;

  /*
  
    append each endpoint to the API
    
   */
  return _.map(endpoints, function(endpointdata){
    return Container.new('endpoint', endpointdata);
  })
}

Stack.prototype.websites = function(){

  var websites = this.options.webserver.virtualhosts;
  /*
  
    append each website to the webserver
    
   */
  return _.map(websites, function(websitedata){
    return Container.new('website', websitedata);
  })
}

Stack.prototype.defaults = function(){
  return defaultoptions;
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

      self.workers = layout.find('workers');
      callback();
    })
}



/*

  we are given 3 sets of instances for us to built out our workers

    core
    web
    api
  
*/
Stack.prototype.deploy_workers = function(allocation, callback){

  var self = this;

  var quarry = ['reception', 'switchboard', 'warehouse', 'web'];

  async.series([

    /*
    
      first get the workers built
      
    */
    function(next){
      async.forEachSeries(quarry, function(type, next){

        self.create_worker(type, allocation[type], next);

      }, callback)
    },

    /*
    
      now boot the nodes onto the workers by adding linking
      the instance to the worker (the key role of the stack)
      
    */
    function(next){

      console.log('-------------------------------------------');
      console.log('booting nodes!');

      process.exit();
      async.forEachSeries(quarry, function(type, next){

        self.boot_nodes(type, next);

      }, callback)
    }
  ])
  


}

/*

  workers are the logical seperation of a stack

  one worker can be deployed onto multiple instances

  the nameserver maps a service name onto one of the instances + the stack allocation (via the deployment)

  this function creates the initial basic workers before they might request any scaling

  the instances upon which to boot each worker are passed in by the infrastructure
  
*/
Stack.prototype.create_worker = function(type, instance, callback){
  var self = this;
  log.info('create_workers: ' + type);

  /*
  
    the core worker is a reception + switchboard for a stack
    
  */
  var worker = Container.new('worker')
    .addClass(type)
    .addClass('root')
    .attr({
      'type':type,
      'instance': _.extend({
        id:instance.quarryid()
      },instance.attr())
        
    })

  self.workers.append(worker).ship(function(){
    
    log.info('worker added: ' + worker.summary());
    self.boot_worker(worker, callback);
  })

}

/*

  get the deployment to boot our worker and tell us when it's ready
  for adding stuff to it via the db
  
*/
Stack.prototype.boot_worker = function(worker, callback){
  var self = this;

  self.emit('deploy_worker', worker, function(){
    console.log('-------------------------------------------');
    console.log('worker booted');

    worker.attr('test', 10).save().ship(function(){
      console.log('-------------------------------------------');
      console.log('saved');
    })

    
  })
  

/*
  worker.portal()
  
    .deep()

    .added('node', function(test){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('HERE AT PORTAL');
      eyes.inspect(test.toJSON());
      
    })
*/
}