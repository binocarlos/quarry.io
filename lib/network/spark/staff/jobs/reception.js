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

  Quarry.io - reception
  ---------------------

  

  
  
*/

module.exports = function(job){

  job.prepare = function(done){
    
    /*
    
      this assigns the endpoints we use for the reception server
      
    */
    var reception_endpoints = {
      front:job.getaddress('quarry'),
      back:job.getaddress('quarry')
    }

    job.spark.attr('endpoints', reception_endpoints);
    
    var serveroptions = _.extend({
      name:'Reception server: ' + job.id,
      id:job.id,
      stackid:job.network.id,
      mapclient:job.mapclient
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
        job.register_with_map_department(function(){
          return reception_endpoints;
        }, next)
      }
    ], done)
  }

  return job;
}