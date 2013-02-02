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

var NameServer = require('./nameserver');

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

function System(layout, deployment){
  EventEmitter.call(this);
  this.initialize(layout, deployment);
}

util.inherits(System, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
System.prototype.initialize = function(layout, deployment){
  var self = this;

  this.layout = layout;
  this.deployment = deployment;
  this.nameserver = new NameServer();

  return this;
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

      var db = supplier.quarrydb({
        collection:'quarry.system',
        reset:true
      })

      self.server.bind(db, nextstep);

    }


  ], function(error){

    error ? log.error(error) : log.info('booted');
    callback(error);

  })

}

/*

  upload system database
  
*/

System.prototype.upload_database = function(layout, callback){
  SupplyChain('system', '/database').connect(function(db){

    var portal = db.portal();

    portal.listen(function(message){

      console.log('-------------------------------------------');
      console.log('portal message hjere');
      eyes.inspect(message);
    })
    
    db.append(layout).ship(function(){
      //eyes.inspect(layout.toJSON());
      //process.exit();
    })
  })
}