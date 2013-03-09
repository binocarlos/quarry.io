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
var Proto = require('./proto');
var Device = require('../../device');

var Heartbeat = require('./tools/heartbeat');

/*

  Quarry.io - Staff Job
  ---------------------

  represents a spark running on a worker

  this is the factory for the different types of job
  
*/

module.exports = function(type, options){
  
  var mapclient = options.mapclient;
  var spark = options.spark;
  var network = options.network;
  var endpoints = network.endpoints;
  var building = options.building;
  var staff = options.staff;
  var jobcontainer = options.jobcontainer;

  var module = require('./jobs/' + type);

  var department_name = jobcontainer.attr('department');

  var job = _.extend({}, {
    id:spark.quarryid(),
    network:network,
    options:options,
    spark:spark,
    container:jobcontainer,
    mapclient:mapclient,
    department:department_name,
    building:building,
    staff:staff,
    /*
    
      this is where each different job does it's business

      it has access to the stuff above
      
    */
    prepare:function(done){
      done();
    },
    begin:function(done){
      var self = this;
      self.prepare(done);
    },
    /*
    
      this starts emitting events back to the map container on the HQ server

      the rest of the network is listening to the map for locations of services

      this is our mesh DNS
      
    */
    register_with_map_department:function(endpoints){
      mapclient.register(jobcontainer.attr('department'), {
        id:spark.quarryid(),
        endpoints:endpoints
      })
    },

    /*
    
      a commonly used device throughout all of the jobs
      
    */
    get_switchboard_mesh:function(){
      return Device('switchboard.meshclient', {
        name:job.department + ' Worker switchboard client: ' + job.id,
        stackid:job.network.id,
        mapclient:job.mapclient
      })
    },
    getaddress:function(type, name){
      return endpoints[type].apply(null, [building.attr('host'), name])
    }    
  })

  module(job);

  return job;
}