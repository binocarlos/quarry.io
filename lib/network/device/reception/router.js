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
var log = require('logule').init(module, 'Reception Router');

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

      //log.info(dye.magenta('API heartbeat') + ' - ' + dye.red(socketid) + ' - ' + dye.yellow(data.stackpath));
      data.socketid = socketid;
      
      /*
      
         is this the first time we have seen this connection
        
      */
      if(!sparks[data.sparkid]){
        
        if(!routes[data.stackpath]){
          routes[data.stackpath] = [];
        }
        routes[data.stackpath].push(data.sparkid);
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
    findspark:function(stackpath){

      function pick(sparkarray){
        return deck.pick(sparkarray || [])
      }

      console.log('-------------------------------------------');
      console.log('searc roiutes');
      eyes.inspect(routes);
      if(routes[stackpath]){
        return pick(routes[stackpath]);
      }

      var parts = stackpath.split('/');
      var foundsparks = null;

      while(parts.length>0 && !foundsparks){
        parts.pop();
        var searchpath = parts.join('/');
        searchpath = searchpath=='' ? '/' : searchpath;
        foundsparks = routes[searchpath];
      }

      return sparks[pick(foundsparks)];
    },
    rpc:function(stackpath){
      var spark = this.findspark(stackpath);

      if(!spark){
        return null;
      }

      return spark.socketid;
    },
    http:function(stackpath){
      var spark = this.findspark(stackpath);

      if(!spark){
        return null;
      }

      return spark.endpoints.http;
    }
  }

  _.extend(router, EventEmitter.prototype);

  return router;
}