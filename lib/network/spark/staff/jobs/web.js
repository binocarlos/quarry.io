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

var Website = require('../../../../website');

/*

  Quarry.io - Web
  ---------------

  The web worker can serve HTTP traffic for a stack

  It's front end is plugged into the stack router (HTTP load balancing)

  It's back end is plugged into the reception front (Quarry load balancing)

  Backend file suppliers will chunk their file contents over quarry

  The web workers are able to cache the file responses and so not stress
  the back end constatnly

  
*/

module.exports = function(job){

  job.prepare = function(done){

    var address = this.getaddress('http', 'http');

    var webserver_endpoints = {
      address:address,
      domains:{}
    }

    var webserver = null;
    var system = null;
    var supplychain = null;

    /*
    
      build up the website app from it's tasklist

      this stage converts tasks into standard website config
      
    */
    function addwebsite(task, callback){
      _.each(task.attr('hostnames'), function(hostname){
        webserver_endpoints.domains[hostname] = true;
      })

      var website = Website({
        task:task,
        system:system,
        cookieSecret:webserver.cookieSecret,
        cookieParser:webserver.cookieParser,
        sessionStore:webserver.sessionStore
      })

      website.plugin(function(){
        webserver.add_website(task.quarryid(), task.attr('hostnames'), website);
        callback();
      })      
    }

    async.series([

      function(next){
        job.get_reception_front(function(error, ret){
          supplychain = ret;
          system = {
            supplychain:supplychain,
            network:job.network
          }
          next();
        })
      },

      function(next){
        webserver = Device('http.server', {
          name:'Web server: ' + job.jobcontainer.summary(),
          cache:job.network.cache,
          address:address
        })
        webserver.plugin(next);
      },

      function(next){
        var jobcontainer = job.jobcontainer;

        async.forEachSeries(jobcontainer.children().containers(), function(website, nextwebsite){

          addwebsite(website, nextwebsite);

        }, next)
        
      },

      function(next){
        job.register_with_map_department(function(){
          return webserver_endpoints;
        }, next);
      }
    ], done)

  }

  return job;
}