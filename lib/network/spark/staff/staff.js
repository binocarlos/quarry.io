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

var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var Device = require('../../device');
var Warehouse = require('../../../warehouse');
var Container = require('../../../container');
var EndpointFactory = require('../../hq/endpointfactory');

var roles = {
  janitor:require('./janitor'),
  worker:require('./worker')
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
    throw new Error('Staff requires some options');
  }

  if(!options.hq){
    throw new Error('Staff requires a hq option');
  }

  if(!options.deployment_database_path){
    throw new Error('Staff requires a deployment_database_path option');
  }

  if(!options.building_id){
    throw new Error('Staff requires a building_id option');
  }

  if(!options.staff_member_id){
    throw new Error('Staff requires a staff_member_id option');
  }

  fs.writeFileSync(options.hq.systemfolders.deployment + '/' + options.staff_member_id + '.json', JSON.stringify(options, null, 4), 'utf8');

  var hq = options.hq;

  var staff = {

    prepare:function(done){

      var self = this;

      var cache = Device('cache.factory', hq.servers.redis);
      var hq_supplychain = Device('hq.client', hq);
      var switchboardclient = Device('switchboard.standardclient', {
        name:'worker ' + options.staff_member_id,
        stackid:'hq',
        endpoints:hq.endpoints
      })

      var deployment_warehouse = hq_supplychain.connect(options.deployment_database_path);
      var endpoints = EndpointFactory(hq.flavour, hq.systemfolders.run);
      
      this.network = _.extend({}, options, {
        switchboardclient:switchboardclient,
        hq_supplychain:hq_supplychain,
        deployment_warehouse:deployment_warehouse,
        endpoints:endpoints,
        cache:cache
      })

      async.series([
        function(next){
          switchboardclient.plugin(next);
        },

        function(next){
          hq_supplychain.plugin(next);
        },

        function(next){
          setTimeout(next, 200);
        },

        function(next){
          deployment_warehouse
            .merge([
              deployment_warehouse('map'),
              deployment_warehouse('=' + options.building_id),
              deployment_warehouse('=' + options.staff_member_id)
            ])
            .title('Loading Worker (Map, Staff Mamber & Building): ' + options.staff_member_id)
            .expect('containers')
            .ship(function(stuff){

              self.mapdepartment = stuff.find('map');
              self.member = stuff.find('.staff');
              self.building = stuff.find('building');
              
              if(self.mapdepartment.empty()){
                throw new Error('the map has not loaded');
              }

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
        }
      ], done)
      
      return this;
    },

    start:function(done){
      var self = this;

      this.prepare(function(){

        self.emit('start', done); 

      })
      


    }

  }

  _.extend(staff, EventEmitter.prototype);

  return staff;
}