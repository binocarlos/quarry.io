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

/*

  Quarry.io - Job
  ---------------

  Represents something that needs to be up and running on the network

  There are various types of job representing the things role on the network
  (reception - middle, warehouse - back, web - front, switchboard - sideways)
  
*/

module.exports = function(config){

  var module = require('./jobs/' + config.department);

  /*
  
     make a new job belonging to that department
    
  */
  var job = {

    id:config.id,
    department:config.department,
    projectid:config.projectid,
    jobcontainer:config.jobcontainer,
    network:config.network,
    

    prepare:function(done){
      done && done();
    },

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

  return job;
}