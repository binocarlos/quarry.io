/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var _ = require('lodash');

var Device = require('../device');


/*

  quarry.io - api node

  virtual host for api servers
  
*/

module.exports = factory;
module.exports.closure = true;

module.exports = function(options, callback){

  var trim = {};
  var spark = options.spark;
  var db = options.db;
  var systemconfig = options.systemconfig;
  var department = options.department;

  /*
  
    the stackpath is worked out by the allocation

    at the beginning - all nodes are allocated to the default
    worker which has the root stack path '/'

    further stack routing happens wuthin the supplychain warehouse
    
  */
  async.series([

    /*
    
      make a clustered switchboard client
      
    */
    function(next){

      Device('switchboard.multiclient', {
        db:db
      }, function(error, client){
        trim.switchboard = client;
        next();
      })

    },

    /*
    
      get a connection to the Redis cache
      
    */
    function(next){

      Device('cache.client', systemconfig.attr('servers.redis'), function(error, cacheclient){
        trim.cache = cacheclient;
        next();
      })

    },    

    function(next){

      /*
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      Device('reception.backconnection', {
        db:db,
        heartbeat:{
          sparkid:spark.quarryid(),
          department:department,
          stackpath:spark.attr('stackpath') || '/',
          endpoints:spark.attr('endpoints')  
        }
      }, function(error, socket){
        trim.receptionback = socket;
        next();
      })
    }


  ], function(error){

    callback(error, trim);
    
  })

}
