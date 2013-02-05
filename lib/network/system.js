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
var jsonloader = require('../tools/jsonloader');
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

function System(options, deployment){
  EventEmitter.call(this);
  this.initialize(options, deployment);
}

util.inherits(System, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
System.prototype.initialize = function(options, deployment){
  var self = this;

  this.options = options;
  this.deployment = deployment;
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
  
    the stacks is what we look after
    
  */
  var stacks = Container.new('stacks');

  /*
  
    this is the servers we have to play with
    
  */
  var infrastructure = Container.new('infrastructure');

  log.info('building localhost');
  
  /*
  
    build and add the localhost to the infrastructure
    
  */
  var localhost = Container.new('instance', {
    name:'localhost',
    hostname:'127.0.0.1',
    cpus:os.cpus().length
  }).id('localhost')

  infrastructure.append(localhost);

  /*
  
    get the root node populated
    
  */
  layout.append([infrastructure, stacks]);

  return layout;
}

/*

  prepare the core system resources (like the system switchboard and core database)
  
*/
System.prototype.boot = function(callback){

  var self = this;

  log.info('System booting');

  /*
  
    the devices we boot to manage the system
    
  */

  var deviceconfigs = [{
    id:'switchboard',
    type:'switchboard',
    sockets:{
      pub:self.deployment.networkaddress('system', 'switchboard', 'pub'),
      sub:self.deployment.networkaddress('system', 'switchboard', 'sub')
    }
  },{
    id:'/database',
    type:'rpc',
    sockets:{
      rpc:self.deployment.networkaddress('system', '/database', 'rpc')
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
      self.slurpstacks(stackfolders, next);
    },

    function(next){
      self.uploadstacks(next);
    }

  ], function(error){
    if(error){
      log.error(error);
      process.exit();
    }

    console.log('-------------------------------------------');
    log.info('System Uploaded');
    process.exit();
  })

}

/*

  load up a stack from a folder
  
*/

System.prototype.build_stack = function(folder){

  var configpath = folder + '/quarry.json';

  var config = jsonloader(configpath, function(){
    process.exit();
  })

  if(!config){
    return;
  }

  config.attr || (config.attr = {});
  config.attr.configpath = configpath;

  var stack = new Stack(config);

  return stack;
}

/*

   build all of the stacks the network found in folders
  
*/
System.prototype.slurpstacks = function(rawstacks, callback){

  var self = this;

  log.info('slurping stacks');

  /*
  
    these are the stacks slupred in from the folder structure
    of the network - they will added to the database once it's
    up and running
    
  */
  async.forEach(rawstacks, function(stackfolder, next_stack){

    log.info('slurping stack: ' + dye.green(stackfolder));

    var stack = self.build_stack(stackfolder);

    if(!stack){
      log.error('stack: ' + stackfolder + ' failed to load');
      next_stack();
    }

    self.stacks.push(stack);
    next_stack();

  }, callback)
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

    self.layoutcontainer = layout;
    self.stackcontainer = layout.find('stacks');
    self.infrastructurecontainer = layout.find('infrastructure');
    
    callback();
  })
}

System.prototype.uploadstacks = function(callback){

  var self = this;
  log.info('uploading stacks');

  async.forEach(self.stacks, function(stack, next_stack){

    log.info('uploading stack: ' + dye.green(stack.id));

    stack.upload(self.stackcontainer, next_stack);

  }, callback)
}