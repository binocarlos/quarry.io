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


var utils = require('../../../utils')
  , eyes = require('eyes')
  , async = require('async')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Device = require('../../device');
var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

var roles = {
  janitor:require('./roles/janitor'),
  worker:require('./roles/worker')
}


/*

  Quarry.io - Worker
  ------------------

  A worker is the logical seperation of processes on quarry.io network

  Several workers can exist in the same building (buildings are physical servers)

  Each worker represents a single process although the drone server will not 
  actually spawn another process

  When jobs are given to workers - they are represented by sparks

  The workers listen for their current sparks as the method of network deployment

  A worker is ALWAYS booted via a JSON config

  this config contains:

    hq -        the standard hq config
    worker -    the worker specific config
      stackpath -  of the worker in the hq database
  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Worker requires some options');
  }

  if(!options.hq){
    throw new Error('Worker requires a hq option');
  }

  if(!options.buildingpath){
    throw new Error('Worker requires a buildingpath option');
  }

  if(!options.staffmemberpath){
    throw new Error('Worker requires a staffmemberpath option');
  }  

  var switchboardclient = Device('switchboard.standardclient', {
    name:'worker ' + options.workerpath,
    stackid:'hq',
    endpoints:options.hq.endpoints
  })
  
  var hq = options.hq;

  var hq_supplychain = Device('hq.client', hq);
  var hq_warehouse = hq_supplychain.connect('/hq');

  var cache = Device('cache.factory', hq.servers.redis);

  var network = {
    hq:hq,
    hq_supplychain:hq_supplychain,
    hq_warehouse:hq_warehouse,
    switchboard:switchboardclient,
    cache:cache,
    stack:{
      id:'hq'
    }
  }

  var staff = _.extend({

    network:network,
    
    prepare:function(done){

      var self = this;

      hq_warehouse
        .merge([
          hq_warehouse.load(options.staffmemberpath),
          hq_warehouse.load(options.buildingpath)
        ])
        .expect('containers')
        .ship(function(stuff){

          self.member = stuff.find('.staff');
          self.building = stuff.find('building');

          if(self.member.empty()){
            throw new Error('a staff has not loaded: ' + options.staffmemberpath);
          }

          if(self.building.empty()){
            throw new Error('a building has not loaded: ' + options.buildingpath);
          }

          var role = self.member.tagname();

          var rolemodule = roles[role];

          rolemodule(self);

          done();

        })

      return this;
    },

    start:function(done){
      var self = this;

      this.prepare(function(){

        self.emit('start', done); 

      })
      


    }

  }, options)

  _.extend(staff, EventEmitter.prototype);

  return staff;
}