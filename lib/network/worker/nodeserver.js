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
var extend = require('xtend');

var eyes = require('eyes');
var _ = require('lodash');
var Container = require('../../container');
var Device = require('../device');
var log = require('logule').init(module, 'Worker');

var Monitor = require('./tools/monitor');
var Heartbeat = require('./tools/heartbeat');

/*

  quarry.io - worker node server

  a wraper for node's having been sparked onto a worker

  
*/

module.exports = NodeServer;

/*

  skeleton network config
  
*/

function NodeServer(){
  EventEmitter.call(this);
}

util.inherits(NodeServer, EventEmitter);

NodeServer.prototype.boot = function(){
  
}