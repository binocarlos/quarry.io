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
var eyes = require('eyes');
var dye = require('dye');
var _ = require('lodash');
var async = require('async');
var Deck = require('deck');
var log = require('logule').init(module, 'Node Section');

var Container = require('../../container');
var Node = require('../node');

/*

  quarry.io - stack section

  a flavour within a stack

  represents stack endpoints and the instances we have to run them on

  each instance we are given we create a worker and then decide
  how to re-allocate

  
*/

module.exports = Section;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function Section(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Section, EventEmitter);

Section.prototype.initialize = function(options){
  _.extend(this, {}, options);
  this.workers = [];
  this.nodes = [];
  return this;
}

Section.prototype.boot = function(callback){
  var self = this;
  async.series([
    function(next){
      log.info(dye.cyan('-------------------------------------------'));
      log.info(dye.cyan('Building workers: ') + dye.magenta(self.id));
      self.build_workers(next);
    },

    function(next){
      log.info(dye.cyan('-------------------------------------------'));
      log.info(dye.cyan('Sparking: ') + dye.magenta(self.id));
      self.spark(next);
    }

  ], callback)
}

/*

  create one worker per instance we have been allocated
  
*/
Section.prototype.build_workers = function(callback){
  var self = this;

  this.emit('loadinstances', function(error, instances){
    self.instances = instances;

    async.forEach(instances.containers(), function(instance, nextinstance){
      self.build_default_worker(instance, function(error, worker){
        self.boot_worker(worker, nextinstance);
      })
    }, callback)  
  })

  return this;
}

/*

  workers are the logical seperation of a stack

  one worker can be deployed onto multiple instances

  the nameserver maps a service name onto one of the instances + the stack allocation (via the deployment)

  this function creates the initial basic workers before they might request any scaling

  the instances upon which to boot each worker are passed in by the infrastructure
  
*/
Section.prototype.build_default_worker = function(instance, callback){

  var self = this;

  log.info('create_worker: ' + this.flavour);

  var instanceobj = instance.attr();
  instanceobj.id = instance.quarryid();

  if(self.workerdb.count()<=0){
    throw new Error('the worker database for ' + this.flavour + ' was not loaded');
  }

  /*
  
    make the worker

  */

  var workerattr = _.extend({}, {
    name:this.id + ' ' + this.flavour + ' worker',
    stackid:this.stackid,
    flavour:this.flavour,
    instance:instanceobj
  }, self.workerconfig);
  
  var worker = Container.new('worker', workerattr)
    .addClass(this.flavour)
    .addClass('default')

  /*

    now append it to the database and get it booted
    
  */
  self.workerdb.append(worker).ship(function(){
    
    log.info('worker added: ' + worker.summary());
    
    callback(null, worker);
  })
  

}

/*

  get the deployment to boot our worker and tell us when it's ready
  for adding stuff to it via the db
  
*/
Section.prototype.boot_worker = function(worker, callback){
  var self = this;

  this.emit('deployworker', {
    flavour:this.flavour,
    stackid:this.stackid,
    allocationid:this.id,
    workerid:worker.quarryid()
  }, function(){
    
    log.info('worker booted: ' + worker.summary());

    /*
    
      setup the radio connection to the worker for heartbeats and wot not
      
    */

    worker
      .radio()
      .listen('heartbeat', function(data){
        log.info('heartbeat: ' + worker.quarryid() + ' : ' + data);
      })
      .listen('monitor', function(data){
        log.info('monitor: ' + worker.quarryid());
        eyes.inspect(data);
        
      })

    callback();
    
  })
  
}

/*

  kick off the default node for starters
  
*/
Section.prototype.spark = function(callback){
  var self = this;

  /*
  
    first build the default node containing all services
    
  */
  this.build_default_node(function(error, node){

    /*
    
      now spark the default node across all of our workers
      
    */

    self.workerdb('worker.default').ship(function(workers){

      self.spark_node(node, workers, callback);
    })
  })
}
/*

   here we build a node for each endpoint they are running

   we then decide how to allocate those nodes 
  
*/
Section.prototype.build_default_node = function(callback){

  var self = this;

  log.info('build nodes: ' + this.flavour);

  /*
  
    build up the config for one node that hosts all this section's services
    in one
    
  */

  var nodeconfig = _.defaults({}, self.servicedb.attr(), {
    name:this.id + ' ' + this.flavour + ' default node',
    stackid:this.stackid,
    flavour:this.flavour
  })


  this.defaultnode = Container.new('node', nodeconfig).addClass(this.flavour).addClass('default');

  _.each(self.servicedb.attr('services') || [], function(serviceconfig){
    var service = Container.new('service', serviceconfig).addClass(this.flavour);
    self.defaultnode.append(service);
  })

  /*
  
    append the nodes and the services so we keep track of the user's intentions
    
  */
  self.servicedb.append(this.defaultnode).ship(function(){

    callback(null, self.defaultnode);
  })

}

/*

   this is where we broadcast radio to the selected workers to spark
   a given node
  
*/
Section.prototype.spark_node = function(node, workers, callback){

  var self = this;

  log.info(dye.red('Sparking node: ') + dye.magenta(this.flavour));
  
  /*
  
    make the radio message 


    
  */
  async.forEach(workers.containers(), function(worker, nextworker){


    /*
    
      allocate the addresses for the node
      
    */
    var endpoints = {};
    
    async.forEach(_.keys(Node.endpoints[self.flavour]) || [], function(name, nextendpoint){

      self.emit('getsparkendpoint', worker, self.flavour + ':' + name, function(error, endpoint){
        endpoints[name] = endpoint;
        nextendpoint();
      })
    }, function(){

      var spark = Container.new('spark', {
        stackid:self.stackid,
        nodeid:node.quarryid(),
        flavour:self.flavour,
        endpoints:endpoints
      }).addClass(self.flavour);

      worker.append(spark).ship(function(){
        nextworker();
      })

    })
    
  }, callback);
  

}