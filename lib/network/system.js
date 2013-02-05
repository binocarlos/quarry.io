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
var Device = require('./device');
var SupplyChain = require('./supplychain');
var log = require('logule').init(module, 'System');
var Container = require('../container');
var os = require('os');
var fs = require('fs');
var dye = require('dye');
var NameServer = require('./nameserver');
var Stack = require('./stack');
var StackContainer = require('./stackcontainer');

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

function System(infrastructure, options){
  EventEmitter.call(this);
  this.initialize(infrastructure, options);
}

util.inherits(System, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
System.prototype.initialize = function(infrastructure, options){
  var self = this;

  this.options = options;
  this.infrastructure = infrastructure;
  this.stackcontainer = new StackContainer();
  this.nameserver = new NameServer();

  this.stacks = [];

  /*
  
    this will be bootstrapped further down
    
  */
  this.db = null;

  return this;
}

/*

  setup the container layout for managing the network
  
*/
System.prototype.get_layout = function(options){
  var self = this;

  /*
  
     the root container for our data
    
  */
  var layout = Container.new('network', options);

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

  log.info('System booting');

  /*
  
    the devices we boot to manage the system
    
  */

  var deviceconfigs = [{
    id:'switchboard',
    type:'switchboard',
    sockets:{
      pub:self.infrastructure.networkaddress('system', 'switchboard', 'pub'),
      sub:self.infrastructure.networkaddress('system', 'switchboard', 'sub')
    }
  },{
    id:'/database',
    type:'rpc',
    sockets:{
      rpc:self.infrastructure.networkaddress('system', '/database', 'rpc')
    }
  }]

  var devices = {};

  async.series([

    function(next){


      /*
      
        first update the nameserver with the system addresses
        
      */
      async.forEach(deviceconfigs, function(deviceoptions, nextdevice){
        log.info('adding system device: ' + deviceoptions.id + ' : ' + deviceoptions.type);

        /*
        
          first update the nameserver with the system device details
          
        */
        self.nameserver.setdevice('system:' + deviceoptions.id, deviceoptions, nextdevice);

      }, next)

    },

    /*
    
      now boot the system switchboard
      
    */
    function(nextstep){

      Device.serverfactory('system:switchboard', function(error, switchboard){
        self.switchboard = switchboard;
        nextstep();
      })

    },

    /*
    
      now setup a proper RPC supply chain to the system database
      
    */

    function(nextstep){

      self.server = SupplyChain('system', '/database');

      self.server.bind(supplier.quarrydb({
        collection:'quarry.system',
        reset:true
      }), nextstep)

    },

    function(nextstep){
      SupplyChain('system', '/database').connect(function(db){
        self.db = db;
        nextstep();
      })
    }


  ], function(error){

    error ? log.error(error) : log.info('booted');
    callback(error);

  })

}

/*

  upload system database
  
*/

System.prototype.upload = function(stackfolders, callback){

  var self = this;

  var layout = this.get_layout();

  async.series([
    

    function(next){
      self.uploaddatabase(next);
    },

    function(next){
      self.stackcontainer.slurpstacks(stackfolders, next);
    },

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


System.prototype.uploaddatabase = function(callback){

  var self = this;
  log.info('uploading database');

  var db = self.db;
  var layout = self.get_layout();
    
  /*
      
    now append the network container
    
  */
  db.append(layout).ship(function(){

    self.layout = layout;
    self.stackcontainer.assign_database(layout.find('stacks'));
    self.infrastructure.assign_database(layout.find('infrastructure'));

    callback();
  })
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

  log.info('booting system')

  async.series([
    function(next){
      log.info('allocating instances');
      self.stackcontainer.allocateinstances(self.infrastructure, next);
    }
  ], callback)

}
