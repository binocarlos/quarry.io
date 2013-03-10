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


var utils = require('../../../../utils')
  , eyes = require('eyes')
  , async = require('async')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Device = require('../../../device');
var Warehouse = require('../../../../warehouse');
var Container = require('../../../../container');

var Job = require('../job');
var Heartbeat = require('../tools/heartbeat');

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

module.exports = function(staff){

  staff.on('start', function(done){

    var jobs = {};

    var createmapclient = staff.createmapclient;
    var worker = staff.member;

    var radio = worker.radio();
    var portal = worker.portal();

    //var heartbeat = Heartbeat(worker.attr('config.heartbeat'));
    var heartbeat = Heartbeat({
      delay:10
    })

    var deployment_warehouse = staff.network.deployment_warehouse;

    portal
      .appended('spark', function(spark){

        var jobid = spark.attr('jobid');
        var department = spark.attr('department');

        deployment_warehouse('=' + jobid + ':tree')
        .title('Loading Job Into Worker: -> ' + department + ' -> ' + jobid)
        .ship(function(jobcontainer){

          if(jobcontainer.empty()){
            throw new Error('job was not loaded: ' + jobid);
          }

          /*
          
             make a new job belonging to that department
            
          */
          var job = Job(jobcontainer.attr('department'), {
            /*
            
              we announce our endpoints over the map radio
              
            */
            mapclient:createmapclient(),

            /*
            
              the spark which is the job in this worker
              and the job itself
              
            */
            spark:spark,
            jobcontainer:jobcontainer,

            /*
            
              the process and server info
              
            */
            network:staff.network,
            building:staff.building,
            
          })

          jobs[job.id] = job;
          
          job.begin(function(){
            
            /*
            
              the job has started - communication is now taking place
              
            */
          })
          
        })
        

      })

    /*
    
      the worker radio tells HR that we are alive
      
    */
    heartbeat.on('beat', function(counter){
      radio.talk('heartbeat', counter);
    })

    setTimeout(function(){
      heartbeat.start();  
    }, Math.round(Math.random()*1000))
    
    done && done();
  })

  return staff;
}