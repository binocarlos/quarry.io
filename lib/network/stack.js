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

var Warehouse = require('../warehouse');
var Container = require('../container');

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
  this.id = options.attr.id;
}

/*

  the initial appending of the stack layout to the 'stacks' folder
  of the network system

*/
Stack.prototype.build_layout = function(){

  var options = this.options;

  /*
  
    first build up the stack layout
    
  */
  var root = Container.new('stack', options.attr);

  var workers = Container.new('workers', options.workers.attr);
  var api = Container.new('api', options.api.attr);
  var webserver = Container.new('webserver', options.webserver.attr);

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
Stack.prototype.upload = function(stackcontainer, callback){

  var self = this;

  this.db = this.build_layout();

  log.info('uploading: ' + dye.green(this.id));

  stackcontainer
    .append(this.db)
    .ship(function(){

      self.workers = self.db.find('workers');
      self.api = self.db.find('api');
      self.webserver = self.db.find('webserver');

      self.setup_portals(callback);
    })
}

/*

  listen in on the database so we can react to things being added and removed
  
*/
Stack.prototype.setup_portals = function(callback){
  var self = this;

  /*
  
    setup a deep portal onto the workers
    so that when a worker is added for this stack we get it booted
    
  */
  self.workers.portal()
    .post('worker', function(worker){

    })

  callback();
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
  
    core: reception, switchboard
    api: stack services
    web: webserver
    
  */
  async.series([

    /*
    
      allocate core workers like reception
      
    */
    function(next){
      self.allocate_core(allocation.core, next);
    },

    /*
    
      allocate the api server workers
      
    */
    function(next){
      self.allocate_api(allocation.api, next);
    },

    /*
    
      allocate the web server workers
      
    */
    function(next){
      self.allocate_web(allocation.web, next);
    }
  ], callback);

}

Stack.prototype.allocate_core = function(instances, callback){

  /*
  
    create a core worker for each cpu on the allocated instance
    
  */
  instances.each(function(instance){

    var worker = Container.new('worker').addClass('core');

    var link = instance.link();
    eyes.inspect(link);
    process.exit();
    worker.attr('instance', instance.link());

    self.workers.append(worker).ship(function(){

      console.log('-------------------------------------------');
      console.log('worker with link appended');
      eyes.inspect(worker);
      process.exit();

    })
  })
}

Stack.prototype.allocate_api = function(instances, callback){
  
}

Stack.prototype.allocate_web = function(instances, callback){
  
}