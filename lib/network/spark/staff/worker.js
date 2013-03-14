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

var MapClient = require('../project/mapclient');
var Heartbeat = require('./tools/heartbeat');

var Job = require('./job');

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

    var worker = staff.member;

    var radio = worker.radio();
    var portal = worker.portal();

    var heartbeat = Heartbeat(worker.attr('config.heartbeat'));
    
    var deployment_warehouse = staff.network.deployment_warehouse;

    portal
      .appended('spark', function(spark){

        var jobid = spark.attr('jobid');
        var projectid = spark.attr('projectid');
        var department = spark.attr('department');

        deployment_warehouse('=' + jobid + ':tree')
        .title('Loading Job Into Worker: -> ' + department + ' -> ' + jobid)
        .ship(function(jobcontainer){

          if(jobcontainer.empty()){
            throw new Error('job was not loaded: ' + jobid);
          }

          var department = jobcontainer.attr('department');
          var module = require('./jobs/' + department);

          

          /*
          
             make a new job belonging to that department
            
          */
          var job = Job({
            id:spark.quarryid(),
            projectid:projectid,
            jobcontainer:jobcontainer,
            network:staff.network,
            department:department,
            /*
    
              this starts emitting events back to the map container on the HQ server

              the rest of the network is listening to the map for locations of services

              this is our mesh DNS
              
            */
            register_with_map_department:function(datafn, callback){
              var mapclient = this.create_map_client();
              mapclient.register(department, function(){
                var data = datafn();
                data.id = spark.quarryid();
                return data;
              }, callback)
            },

            create_map_client:function(){
              return MapClient({
                stackid:spark.quarryid(),
                container:staff.mapdepartment.spawn(staff.mapdepartment.models),
                talkdelay:1000,
                worrydelay:3000
              })
            },

            create_reception_server:function(done){
              /*
              
                this assigns the endpoints we use for the reception server
                
              */
              var reception_endpoints = {
                front:job.getaddress('quarry'),
                back:job.getaddress('quarry')
              }

              var serveroptions = _.extend({
                name:'Reception server: ' + job.id,
                id:job.id,
                stackid:job.network.id,
                mapclient:job.create_map_client()
              }, reception_endpoints)

              var receptionserver = null;

              async.series([
                function(next){
                  console.log('-------------------------------------------');
                  console.log('making reception server');
                  receptionserver = Device('reception.server', serveroptions);
                  receptionserver.plugin(next);   
                },

                function(next){
                  console.log('-------------------------------------------');
                  console.log('making reception server');
                  reception_endpoints.wireids = receptionserver.wireids;
                  job.spark.attr('endpoints', reception_endpoints);
                  job.register_with_map_department(function(){
                    return reception_endpoints;
                  }, next)
                }
              ], done)
            },

            create_switchboard_server:function(done){
              var switchboard_endpoints = {
                pub:this.getaddress('quarry', 'pub'),
                sub:this.getaddress('quarry', 'sub'),
                sidewayspub:this.getaddress('quarry', 'sidewayspub'),
                sidewayssub:this.getaddress('quarry', 'sidewayssub')
              }

              var serveroptions = _.extend({
                name:'Switchboard server: ' + job.id,
                jobid:job.id,
                stackid:job.network.id,
                mapclient:job.create_map_client()
              }, switchboard_endpoints)

              var switchboardserver = Device('switchboard.meshserver', serveroptions);

              switchboardserver.plugin(function(){
                job.register_with_map_department(function(){
                  return switchboard_endpoints;
                }, done)
              })
            },
            /*
            
              a commonly used device throughout all of the jobs
              
            */
            get_switchboard_mesh:function(callback){
              if(this._switchboard_mesh){
                return this._switchboard_mesh;
              }
              this._switchboard_mesh = Device('switchboard.meshclient', {
                name:job.department + ' Worker switchboard client: ' + job.id,
                stackid:job.network.id,
                mapclient:this.create_map_client()
              })

              return this._switchboard_mesh;
            },

            /*
            
              get a reception back connection for warehouse workers
              
            */
            get_reception_back:function(callback){
              var receptionback = Device('reception.backclient', {
                name:department + ' Worker reception back',
                department:department,
                switchboard:this.get_switchboard_mesh(),
                mapclient:this.create_map_client()
              })

              receptionback.plugin(function(){
                callback(null, receptionback);
              })
            },

            /*
            
              get a reception back connection for warehouse workers
              
            */
            get_reception_front:function(callback){
              var supplychain = Device('reception.frontclient', {
                name:job.department + ' Worker reception front',
                department:job.department,
                stackid:job.projectid,
                cache:job.network.cache,
                switchboard:this.get_switchboard_mesh(),
                mapclient:this.create_map_client()
              })

              supplychain.plugin(function(){
                callback(null, supplychain);
              })
            },

            /*
            
              get an address from the endpoint factory
              
            */
            getaddress:function(type, name){
              return staff.network.endpoints[type].apply(null, [staff.building.attr('host'), name])
            }

            
            
          }

          _.extend(job, EventEmitter.prototype);

          module(job);

          jobs[job.id] = job;

          process.nextTick(function(){
            job.prepare(function(){
              
              /*
              
                the job has started - communication is now taking place
                
              */
            })  
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