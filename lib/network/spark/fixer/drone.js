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
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

var StaffBooter = require('../staff');

/*

  Quarry.io - Drone Deployment
  ----------------------------

  This boots workers in memory and uses IPC sockets

  It is basically a whole stack within a function : )
  
*/
module.exports = function(options){

  if(!options){
    throw new Error('fixer drone requires some options');
  }

  var network = options.network;
  var hq = network.hq;

  /*
  
    id map of workers that have been booted internally
    
  */
  var janitors = {};
  var workers = {};

  var deployment = {

    /*
    
      get a skeleton workforce of one building and part-time worker

      the drone server only needs these to start

      as more buildings and workers are added - they are fake copies
      of localhost

      this allows simulation of a big network all within a single drone

    */
    hire_workforce:function(callback){

      var gardenshed = Container.new('building', {
        name:'localhost: gardenshed',
        host:'127.0.0.1'
      }).addClass('drone')

      var dronejanitor = Container.new('janitor', {
        name:'Part-time Janitor'
      }).addClass('drone').addClass('staff')

      var droneworker = Container.new('worker', {
        name:'Part-time Worker'
      }).addClass('drone').addClass('staff')

      gardenshed.append([dronejanitor, droneworker]);

      callback && callback(null, gardenshed);

      return gardenshed;
    },

    start_staffmember:function(staffpptions, callback){

      var building = staffpptions.building;
      var staff = staffpptions.staff;
      var addtomap = staffpptions.addtomap;

      /*
      
        in memory
        
      */
      StaffBooter({
        id:options.id,
        building_id:building.quarryid(),
        staff_member_id:staff.quarryid(),
        deployment_database_path:options.deployment_database_path,
        hq:hq
      }, function(error, staffprocess){
        if(error){
          callback(error);
          return;
        }
        addtomap[staff.quarryid()] = staffprocess;
        callback(null, staffprocess);
      })

      
    },

    /*
    
      get the janitor booted onto a building
      
    */
    start_janitor:function(options, callback){

      deployment.start_staffmember({
        addtomap:janitors,
        building:options.building,
        staff:options.janitor
      }, callback)
      
      
    },

    /*
    
      the function the knows how to start a worker in a building
      
    */
    start_worker:function(options, callback){

      deployment.start_staffmember({
        addtomap:workers,
        building:options.building,
        staff:options.worker
      }, callback)
      
    }
  }

  _.extend(deployment, EventEmitter.prototype);

  return deployment;
}