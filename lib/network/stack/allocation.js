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
var dye = require('dye');
var log = require('logule').init(module, 'Allocation');

var Section = require('./section');
var Node = require('../node');

/*

  quarry.io - infrastructure allocation

  represents what instances the infrestructure has given to a stack

  the stack decides how to allocate workers onto it's allocated instances

  
*/

module.exports = Allocation;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function Allocation(infrastructure, stack){
  EventEmitter.call(this);
  this.initialize(infrastructure, stack);
}

util.inherits(Allocation, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
Allocation.prototype.initialize = function(infrastructure, stack){
  this.infrastructure = infrastructure;
  this.stack = stack;
  this.id = stack.id;
  this.sections = {};
  return this;
}

/*

  at first - we allocate one worker per role
  we cycle through the instances to choose where the worker lives
  
*/
Allocation.prototype.build = function(finished){

  var self = this;

  /*
  
     loop each flavour and make a worker for each one
    
  */
  async.forEachSeries(Node.stackflavours, function(flavour, nextflavour){

    log.info(dye.cyan('-------------------------------------------'));
    log.info(dye.cyan('Building section: ') + dye.red(self.id) + ' ' + dye.magenta(flavour));
    
    /*
    
      a group represents the action for one of:

        webserver
        reception
        apiserver

      it creates the nodes that represent the services
      it also creates the workers that we have available

      the allocation decides what to do by adding nodelinks
      onto workers

      
      
    */
    var section = new Section({
      id:self.id + ':' + flavour,
      stackid:self.id,
      flavour:flavour,
      deployworker:_.bind(self.deployworker, self),
      workerconfig:self.stack.get_workers_root().attr(),
      workerdb:self.stack.get_workerdb(flavour),
      servicedb:self.stack.get_servicedb(flavour)
    })

    section.on('loadinstances', function(callback){
      self.infrastructure.allocate({
        stack:self.stack,
        bootmode:true,
        flavour:flavour
      }, callback);
    })

    section.on('getsparkendpoint', function(worker, name, callback){
      callback(null, self.infrastructure.workerendpoint(worker, name));
    })

    section.on('deployworker', function(worker, callback){
      self.infrastructure.deploy(worker, callback);
    })

    section.boot(function(){
      self.sections[flavour] = section;
      log.info(dye.cyan('-------------------------------------------'));
      log.info(dye.cyan('Section Booted: ') + dye.red(self.id) + ' ' + dye.magenta(flavour));
      nextflavour();
    })

  }, finished)
    
}