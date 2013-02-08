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

var _ = require('lodash');
var async = require('async');
var osm = require("os-monitor");
var EventEmitter = require('events').EventEmitter;
/*

  quarry.io - worker monitor

  gets system information every N milliseconds and runs the callback with it

  the returned object has a cancel method

  
*/

module.exports = function(options){

  _.defaults(options, {
    delay: 5000,
    freemem: 250000000,
    critical1: 0.7,
    critical5: 0.7,
    critical15: 0.7
  })

  var monitor = {
    start:function(){
      osm.start(options);
    },
    isRunning:function(){
      return osm.isRunning();
    },
    stop:function(){
      return osm.stop();
    }
  }

  osm.on('monitor', function(event) {
    event.process = {
      title:process.title,
      pid:process.pid,
      memory:process.memoryUsage(),
      uptime:process.uptime()
    }
    monitor.emit('data', event);
  })

  _.extend(monitor, EventEmitter.prototype);

  return monitor;
}