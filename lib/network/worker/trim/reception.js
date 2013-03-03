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
var _ = require('lodash');
var async = require('async');
var Node = require('./proto');

var Device = require('../device');

/*

  quarry.io - reception node

  the network middleware
  
*/

module.exports = function(worker, system){

  return function(spark, callback){

    var endpoints = spark.attr('endpoints');
    
    async.series([

      var trim = {};

      /*
      
        make a clustered switchboard cliebt
        
      */
      function(next){

        Device('switchboard.multiclient', {
          db:system.db
        }, function(error, client){
          trim.switchboard = client;
          next();
        })

      },

      function(next){
        trim.server = Device('reception.server', {
          stackid:spark.attr('stackid'),
          socketid:spark.quarryid(),
          switchboard:trim.switchboard
        })

        server.bind(endpoints);
      }

    ], function(){

      callback();
    })
  
  
  }
  
}