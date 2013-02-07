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
var _ = require('lodash');
var async = require('async');
var supplier = require('../supplier');

var log = require('logule').init(module, 'System');
var Container = require('../container');
var dye = require('dye');

var Device = require('./device');
var Infrastructure = require('./infrastructure');
var StackContainer = require('./system/stackcontainer');

/*

  quarry.io - network system

  a quasi stack that looks after all the other stacks

  I tried to get the system to be a stack - somehow boot
  as a stack and then turn around and become the thing that
  booted stacks.

  At this point 15 years of messy software says stop, KISS.

  The system is NOT a stack - it is a system, that boots stacks : )
  
*/

module.exports = System;

function System(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(System, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
System.prototype.initialize = function(options){
  var self = this;

  options || (options = {});
  this.options = options;

  return this;
}

/*

  setup the container layout for managing the network
  
*/
System.prototype.get_layout = function(){
  var self = this;

  /*
  
     the root container for our data
    
  */
  var layout = Container.new('system', self.options);

  /*
  
    get the root node populated
    
  */
  layout.append([this.infrastructure.get_layout(), this.stackcontainer.get_layout()]);

  return layout;
}

/*

  prepare the core system resources (like the system switchboard and core database)
  
*/
System.prototype.prepare = function(callback){

  var self = this;

  log.info('System preparing');

  async.series([

    /*
    
      build the infrastructure using the flavour to decide which
      mixins to use
      
    */
    function(next){
      log.info('Building Infrastructure');
      self.infrastructure = Infrastructure(self.options.flavour, self.options.infrastructure);
      self.infrastructure.prepare(next);
    },

    /*
    
      get the system endpoints from the infrastructure
      
    */
    function(next){
      log.info('Getting Endpoints');
      self.endpoints = self.infrastructure.get_system_endpoints();
      self.supplychain_config = {
        id:'system',
        stackid:'system',
        stackpath:'/',
        endpoints:self.endpoints
      }
      next();
    },

    /*
    
      the manager for the stacks
      
    */
    function(next){
      log.info('Building StackContainer');
      self.stackcontainer = new StackContainer(self.options.stackcontainer);
      self.stackcontainer.prepare(next);
    },


    /*
    
      the system switchboard server
      
    */
    function(next){
      log.info('Building Switchboard');
      
      self.switchboard = Device('switchboard.server', {
        id:'system.switchboard',
        endpoints:self.endpoints
      })

      self.switchboard.bind();
      next();

    },

    /*
    
      the system supplychain server
      
    */
    function(next){
      log.info('Building SupplyChain Server');

      self.server = Device('supplychain.server', self.supplychain_config);

      /*
      
        add in the system database
        
       */
      var db = supplier.quarrydb(_.extend({
        collection:'quarry.system',
        reset:true
      }, self.options.servers.mongo))

      self.server.use(db);

      self.server.bind();

      next();
      
    },

    /*
    
      the system supplychain client
      
    */
    function(next){
      log.info('Building SupplyChain Client');

      self.client = Device('supplychain.client', self.supplychain_config);

      /*
      
        get the database as a container
        
      */
      self.client.connect(function(db){

        log.info('Database Connection Ready');

        var layout = self.get_layout();

        db.append(layout).ship(function(){
          console.log('-------------------------------------------');
          console.log('after append');
          process.exit();
        })
      })

      
    },

  ], callback)

}

/*

  this is the spark of the whole thing

  we have already prepared the system and the database

  we now:

  1. allocate workers to each stack (via deployment)
  2. once the workers have booted - we append the api's and webservers
  
*/
System.prototype.boot = function(callback){
  var self = this;

  async.series([
    function(next){
      log.info('allocating instances');
      self.stackcontainer.allocate(self.infrastructure, next);
    },

    function(next){
      log.info('building workers');
      process.exit();
      self.stackcontainer.buildworkers(next);
    }
  ], callback)

}


/*

  upload system database
  
*/

System.prototype.upload = function(stackfolders, callback){

  var self = this;

  async.series([
    

    /*
    
      get the database uploaded and hook up the containers
      
    */
    function(next){
      self.database.upload(function(error){
        self.stackcontainer.assign_database(layout.find('stacks'));
        self.infrastructure.assign_database(layout.find('infrastructure'));
        next();
      })
    },

    /*
    
      load the user stacks from disk
      
    */
    function(next){
      self.stackcontainer.slurpstacks(stackfolders, next);
    },

    /*
    
      get them uploaded to the db
      
    */
    function(next){
      self.stackcontainer.uploadstacks(next);
    }

  ], function(error){
    if(error){
      log.error(error);
      process.exit();
    }

    callback();
  })

}

