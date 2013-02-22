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
var utils = require('../../../utils');
var util = require('util');
var dye = require('dye');
var EventEmitter = require('events').EventEmitter;
var log = require('logule').init(module, 'Switchboard Server');
var Device = require('../../device');

module.exports = SwitchboardServer;

/*
  Quarry.io - Switchboard Server
  ------------------------------

  A binding of a pub and sub as a central message broker

  

 */

function SwitchboardServer(options){
  EventEmitter.call(this);

  log.info('creating switchboard server');

  var self = this;

  this.pub = options.pub;
  this.sub = options.sub;

  this.sub.subscribe('');

  this.extrapubs = {};

  this.sub.on('message', function(packet){
    var st = packet.toString();
    self.pub.send(packet);
  })
}

util.inherits(SwitchboardServer, EventEmitter);

/*

   in bind mode we are a single socket
  
*/
SwitchboardServer.prototype.bind = function(pub, sub){
  log.info(dye.red('binding') + ' PUB: ' + dye.red(pub));
  this.pub.bindSync(pub);
  log.info(dye.red('binding') + ' SUB: ' + dye.red(sub));
  this.sub.bindSync(sub);
  return this;
}

/*

  another switchboard server has come online

  mesh onto it
  
*/
SwitchboardServer.prototype.addspark = function(spark){
  var endpoints = spark.attr('endpoints');
  var socket = Device.socket('pub');
  this.extrapubs[spark.quarryid()] = socket;
  socket.connect(endpoints.pub)
  return this;
}

/*

  a switchboard server has been removed
  
*/
SwitchboardServer.prototype.removespark = function(spark){
  var socket = this.extrapubs[spark.quarryid()];
  socket.disconnect();
  delete(this.extrapubs[spark.quarryid()]);
  return this;
}