/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var deck = require('deck');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');

module.exports = Router;

/*
  Quarry.io - Reception Router
  ----------------------------

  Keeps track of the sockets available for each stack path
  and routes requests to them

 */

function Router(){

  /*
  
    a map of stackpath onto array of spark ids
  */
  var routes = {};

  /*
  
    map of spark id onto the most recent heartbeat
    
  */
  var sparks = {};

  /*
  
    the timeout ids for cleaning up non-heartbeating sockets
    
  */
  var garbagecollector = {};

  var router = {
    heartbeat:function(socketid, data){

      data.socketid = socketid;
      var department = data.department;
      var endpoints = data.endpoints;
      
      var routingkey = (department || 'api') + ':' + data.stackpath;
      
      /*
      
         is this the first time we have seen this connection
        
      */
      if(!sparks[data.sparkid]){
        
        if(!routes[routingkey]){
          routes[routingkey] = [];
        }
        routes[routingkey].push(data.sparkid);
      }

      sparks[data.sparkid] = data;

      if(garbagecollector[data.sparkid]){
        clearTimeout(garbagecollector[data.sparkid]);
      }

      garbagecollector[data.sparkid] = setTimeout(function(){
        routes[data.stackpath] = _.filter(routes[data.stackpath], function(id){
          return id!=data.sparkid;
        })
        delete(sparks[data.sparkid])
      }, 5000);
    },
    rpc:function(department, stackpath){
      var spark = this.search(department, stackpath);

      return spark ? spark.socketid : null;
    },
    endpoints:function(department, stackpath){
      var spark = this.search(department, stackpath);

      return spark ? spark.endpoints : null;
    },
    search:function(department, stackpath){

      function picksocket(route){
        var routingkey = (department || 'api') + ':' + route;
        var sparkidarray = routes[routingkey];
        var sparkid = deck.pick(sparkidarray || []);
        var spark = sparks[sparkid];

        return spark;
      }

      function testroute(route){
        var routingkey = (department || 'api') + ':' + route;
        if(routes[routingkey]){
          return true;
        }
        else{
          return false;
        }
      }

      if(testroute(stackpath)){
        return picksocket(stackpath);
      }
      else{
        var parts = stackpath.replace(/^\//, '').split('/');
        parts.pop();
        while(parts.length>0){
          var r = '/' + parts.join('/');          
          if(testroute(r)){
            return picksocket(r);
          }
          var last = parts.pop();
        }
        if(testroute('/')){
          return picksocket('/');
        }
        else{
          return null;  
        }
      }
    }
  }

  _.extend(router, EventEmitter.prototype);

  return router;
}