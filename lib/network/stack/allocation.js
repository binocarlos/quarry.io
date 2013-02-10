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

Allocation.prototype.build = function(systemdb, callback){
  var self = this;

  this.systemdb = systemdb;
  
  async.series([
    /*

      get the instances upon which we will boot the core stack services like:

      
    */
    function(next){

      self.infrastructure.allocate(self.stack, {
        bootmode:true
      }, function(error, instances){

        self.instances = instances;
        next();

      })
    },

    /*
    
      create the groups representing the different flavours of worker
      
    */
    function(next){

      self.build_groups(next);

    }
  ], callback)
 
}

/*

  at first - we allocate one worker per role
  we cycle through the instances to choose where the worker lives
  
*/
Allocation.prototype.build_groups = function(callback){

  var self = this;
  /*
  
    basic one per role allocation
    
  */
  var arr = this.instances.containers();
  var index = 0;

  function getinstance(){
    var ret = arr[index];
    index++;
    if(index>=arr.length){
      index = 0;
    }
    return ret;
  }

  /*
  
     loop each flavour and make a worker for each one
    
  */
  async.forEach(Node.stackflavours, function(flavour, nextflavour){

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
      instances:getinstance(),
      systemdb:self.systemdb,
      workerconfig:self.stack.get_workers_root().attr(),
      workerdb:self.stack.get_workerdb(flavour),
      servicedb:self.stack.get_servicedb(flavour)
    })

    section.on('deployworker', function(worker, callback){
      self.infrastructure.deployworker(worker, callback);
    })

    section.boot(function(){
      self.sections[flavour] = section;
      nextflavour();
    })

  }, callback)
}