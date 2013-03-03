/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
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