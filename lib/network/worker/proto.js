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
var Container = require('../../container');
var Device = require('../device');
var log = require('logule').init(module, 'Worker');
var dye = require('dye');

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
  this.server = new NodeServer(options);
}

util.inherits(Worker, EventEmitter);

Worker.prototype.boot = function(callback){
  var self = this;

  var systemclient = Device('system.client');

  var database = self.options.system.database;

  log.info(dye.magenta('worker  - connecting to system'));

  /*
  
    connect to the system so we get a reference to our container within the system db
    
  */
  systemclient.connect(database.endpoints, function(db){

    log.info(dye.magenta('worker - loading stack'));

    db('stack#' + self.options.stackid).ship(function(stack){
      
      log.info(dye.magenta('Database Connection Ready - loading worker from db'));

      self.db = stack;
      self.server.db = stack;

      if(stack.count()<=0){
        throw new Error('stack container was not loaded');
      }

      /*
      
        get a portal onto the worker that we are so the system
        can communicate with us
       */
      stack('worker=' + self.options.workerid).ship(function(worker){


        log.info(dye.magenta('worker loaded'));
        /*
        
          now we have our worker - hook it up
          
        */
        self.container = worker;
        self.portal = worker.portal();
        self.radio = worker.radio();
        self.monitor = Monitor(worker.attr('monitor'));
        self.heartbeat = Heartbeat(worker.attr('heartbeat'));

        self.start_comms(callback);
        
      })
    
    })
    
  })

}

Worker.prototype.start_comms = function(callback){
  var self = this;
  
  /*
  
    when nodes are added - boot them
    
  */
  self.portal
    .appended('spark', _.bind(this.spark_node, this));

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

Worker.prototype.spark_node = function(spark){
  var self = this;

  /*

  
    first lets find the node
    
  */
  self.db('node=' + spark.attr('nodeid') + ':tree').ship(function(node){


    /*
    
      add the node to the server - it will look after booting/hosting it
      
    */
    self.server.add(node, spark, function(){
      
    })
    
  })
}
