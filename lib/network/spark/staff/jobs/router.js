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

  Quarry.io - Router
  ------------------

  

  
  
*/

module.exports = function(job){

  /*
  var router_endpoints = {
    front:this.getaddress('http', 'front')
  }
  */

  /*
  
    a fake endpoint for the minute until we get the proper HQ router on the go
    
  */
  var router_endpoints = {
    front:{
      host:'127.0.0.1',
      port:80
    }
  }

  var router = Device('http.router', {
    address:router_endpoints.front
  })

  function addweb(message){
    eyes.inspect(message);
    _.each(message.domains, function(v, domain){
      console.log('-------------------------------------------');
      console.log('ADD: ' + domain);
      eyes.inspect(message);
      router.add(domain, message.address);
    })
  }

  function removeweb(message){
    eyes.inspect(message);
    _.each(message.domains, function(v, domain){
      console.log('-------------------------------------------');
      console.log('REMOVE: ' + domain);
      eyes.inspect(message);
      router.remove(domain, message.address);
    })
  }

  job.prepare = function(done){

    var mapclient = job.create_map_client();



    async.series([
      function(next){
        /*

          listen for any webservers arriving
          
        */
        mapclient.listen('web');

        mapclient.on('add', addweb);
        mapclient.on('remove', removeweb);
        next();
      },

      function(next){
        console.log('-------------------------------------------');
        console.log('registering router with map');
        job.register_with_map_department(function(){
          return router_endpoints;
        }, next);
      },

      function(next){
        console.log('-------------------------------------------');
        console.log('BOOTING router');
        router.plugin(next);
      }
    ], done)
  }

  return job;
}