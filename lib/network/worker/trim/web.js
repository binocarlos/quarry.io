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
var Device = require('../device');

/*

  quarry.io - web worker

  system = {
    db:connected database,
    config:config container
  }

  
  
*/

module.exports = function(worker, system){

  return function(spark, callback){

    var trim = {};

    async.series([

      /*
      
        front
        
      */
      function(next){

        Device('node.rpcclient', {
          db:system.db,
          spark:spark,
          systemconfig:system.config          
        }, function(error, fronttrim){
          _.extend(trim, fronttrim);
          next();
        })

      }

    ], function(error){

      callback(error, trim);
    })
  
}