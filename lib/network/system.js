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

var Node = require('./node');
var Device = require('./device');
var Infrastructure = require('./infrastructure');
var StackCollection = require('./stack/collection');

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
  var layout = Container.new('network', self.options);

  /*
  
    get the root node populated
    
  */
  layout.append([this.infrastructure.get_layout(self.options), this.collection.get_layout(self.options)]);

  return layout;
}

/*

  this gets the core HTTP router up and running
  
*/
System.prototype.boot_network_services = function(callback){
  var self = this;
  async.forEachSeries(Node.networkflavours, function(flavour, nextflavour){
    log.info(dye.cyan('-------------------------------------------'));
    log.info(dye.cyan('Building system section: ') + dye.magenta(flavour));

    self.infrastructure.networkdeploy(flavour, callback);
  })
}



/*

  prepare the core system resources (like the system switchboard and core database)
  
*/
System.prototype.boot = function(callback){

  var self = this;

  log.info(dye.cyan('-------------------------------------------'));
  log.info(dye.cyan('Booting System'));

  async.series([

    /*
    
      build the infrastructure using the flavour to decide which
      mixins to use
      
    */
    function(next){
      log.info('Building Infrastructure');
      self.infrastructure = Infrastructure(self.options.infrastructure, self.options);
      self.infrastructure.prepare(function(){
        self.options.database.endpoints = self.infrastructure.get_system_endpoints();
        next();
      });
    },


    /*
    
      the manager for the stacks
      
    */
    function(next){
      log.info('Building StackCollection');
      self.collection = new StackCollection(self.options);
      self.collection.prepare(next);
    },

    /*
    
      the system supplychain server
      
    */
    function(next){
      log.info('Building SupplyChain Server');

      var endpoints = self.options.database.endpoints

      var server = Device('system.server', self.options);

      server.bind(endpoints);

      next();

    },

    /*
    
      the system supplychain client
      
    */
    function(next){
      log.info('Building SupplyChain Client');

      var endpoints = self.options.database.endpoints

      var systemclient = Device('system.client');

      systemclient.connect(endpoints, function(db){

        log.info('Database Connection Ready');

        var layout = self.get_layout();

        db.append(layout).ship(function(){

          self.collection.assign_database(layout.find('system'));
          self.infrastructure.assign_database(layout.find('infrastructure'));

          next();
        })
      })

      
    },

    function(next){

      log.info('Uploading Stacks');

      self.collection.upload(next);
    },

    function(next){
      log.info('allocate stacks');
      
      self.collection.build(self.infrastructure, next);
    },

    function(next){
      log.info('booting network services');

      self.boot_network_services(next);
    }

  ], callback)

}