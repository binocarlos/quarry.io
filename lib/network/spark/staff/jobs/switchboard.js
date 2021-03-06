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


/*

  Quarry.io - Switchboard Server Job
  ----------------------------------

  this hosts a single switchboard server but writes messages
  to all the other switchboard servers pub sockets

  this way we get an auto-scaling mesh because each client
  is hooked up to re-bind it's subscription keys upon moving servers

  
  
*/

module.exports =  function(job){
  
  job.prepare = function(done){
    /*
    
      these are the server endpoints we are binding on
      
    */
    var switchboard_endpoints = {
      pub:this.getaddress('quarry', 'pub'),
      sub:this.getaddress('quarry', 'sub'),
      sidewayspub:this.getaddress('quarry', 'sidewayspub'),
      sidewayssub:this.getaddress('quarry', 'sidewayssub')
    }

    /*
    
      this assigns the endpoints we use for the reception server
      
    */
    this.spark.attr('endpoints', switchboard_endpoints);

    var serveroptions = _.extend({
      name:'Switchboard server: ' + job.id,
      jobid:job.id,
      stackid:job.network.id,
      mapclient:job.create_map_client()
    }, switchboard_endpoints)

    async.series([
      function(next){
        console.log('-------------------------------------------');
        console.log('making switchboard mesh server');
        var switchboardserver = Device('switchboard.meshserver', serveroptions);
        switchboardserver.plugin(next);
      },

      function(next){
        console.log('-------------------------------------------');
        console.log('registering switchboard with map');
        job.register_with_map_department(function(){
          return switchboard_endpoints;
        }, next);
      }
    ], done)

  }
}