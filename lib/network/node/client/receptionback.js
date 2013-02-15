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
var deck = require('deck');
var log = require('logule').init(module, 'Reception Back Client');
var Device = require('../../device');
var SparkMonitor = require('../tools/sparkmonitor');
var SocketCombo = require('../tools/socketcombo');

var dye = require('dye');

module.exports = factory;

function factory(db, callback){

  var self = this;

  var mainspark = null;

  var sparks = {};

  var monitor = SparkMonitor({
    db:db,
    selector:'group#workers.reception'
  })

  var socketcombo = SocketCombo();

  monitor.on('add', function(spark){

    sparks[spark.quarryid()] = spark;

    var endpoints = spark.attr('endpoints');

    var socket = Device.socket('router');

    log.info(dye.magenta('connecting') + ' RECEPTION BACK: ' + dye.magenta(spark.attr('endpoints').sub));
    socket.connect(endpoints.back);

    socketcombo.add(spark.quarryid(), socket);
    
  })

  monitor.on('remove', function(spark){
    
    delete(sparks[spark.quarryid()]);

    socketcombo.remove(spark.quarryid());

  })

  monitor.start(function(){
    callback(null, socketcombo);
  })

  return socketcombo;
}