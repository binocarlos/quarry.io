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

  var spark = options.spark;

  var trim = {};

  /*
  
    the stackpath is worked out by the allocation

    at the beginning - all nodes are allocated to the default
    worker which has the root stack path '/'

    further stack routing happens wuthin the supplychain warehouse
    
  */
  async.series([

    function(next){
      Device('node.backconnection', {
        db:options.db,
        spark:options.spark,
        systemconfig:options.systemconfig,
        department:options.department
      }, function(error, backtrim){
        _.extend(trim, backtrim);
        next();
      })
    },

    /*
    
      make a clustered switchboard client
      
    */
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
