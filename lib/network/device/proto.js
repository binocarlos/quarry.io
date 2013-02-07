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
var util = require('util');
var utils = require('../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var transport = require('../transport/zeromq');
var log = require('logule').init(module, 'Device');

module.exports = Device;



/*
  Quarry.io - Device Proto
  ------------------------

  Provides a useful base class for devices

  

 */

function Device(options){
  EventEmitter.call(this);
  options || (options = {});
  this.options = options;
  this.id = this.options.id;
  this.endpoints = this.options.endpoints;
}

util.inherits(Device, EventEmitter);

Device.prototype.get_socket = function(type){
  var socket = transport(type);
  socket.identity = this.id + ':' + type + ':' + utils.littleid();
  return socket;
}