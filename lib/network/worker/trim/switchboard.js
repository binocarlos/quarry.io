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
var Device = require('../device');

/*

  quarry.io - switchboard worker
  
*/

module.exports = Switchboard;

/*

  skeleton network config
  
*/

module.exports = function(worker, system){

  return function(spark, callback){

    var endpoints = spark.attr('endpoints');

    var trim = {};

    trim.server = Device('switchboard.server', _.extend({
      pub:Device.socket('pub'),
      sub:Device.socket('sub')
    }, spark.attr()))

    Device('node.sparkmonitor', {
      db:system.db,
      selector:'workers.switchboard',
      ignore_spark:spark.quarryid()
    }, function(error, monitor){
      monitor.on('add', function(spark){
        device.addspark(spark);
      })

      monitor.on('remove', function(spark){
        device.removespark(spark);
      })

      monitor.start(function(error){

        device.bind(endpoints.pub, endpoints.sub);

        callback(error, trim);
      })
    })
  }
}