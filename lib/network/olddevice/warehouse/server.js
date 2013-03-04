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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var _ = require('lodash');

var Node = require('./proto');
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
        db:options.db,
        heartbeat:{
          department:'warehouse',
          sparkid:options.spark.quarryid(),
          stackpath:spark.attr('stackpath') || '/',
          endpoints:spark.attr('endpoints')  
        }
      }, function(error, socket){
        trim.receptionback = socket;
        next();
      })
    },


    function(next){

      /*
      
        connect the backend reception socket to the JSON RPC
        
      */
      trim.rpcserver = Device('rpc.server', {
        json:true,
        socket:trim.receptionback
      })

      /*
      
        then we have a supply chain connected through to reception back
        
      */
      trim.supplychain = Device('supplychain.server', {
        switchboard:trim.switchboard,
        stackid:spark.attr('stackid'),
        rpc:trim.rpcserver
      })

      next();
    }
  ], function(error){
    callback(error, trim);
  })

}
