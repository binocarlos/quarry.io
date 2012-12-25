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

var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var eyes = require('eyes');
var EventEmitter2 = require('EventEmitter2').EventEmitter2;

//var Proto = require('./proto');

var Switchboard = module.exports = {};


/*
  Quarry.io - Switchboard
  -----------------------

  Looks after all events within a single domain (warehouse)


 */

/*


  Constructor




 */

Switchboard.pubsub = true;

Switchboard.initialize = function(options){
  options || (options = {});
  this.channels = {};
  return this;
}

Switchboard.inject_network = function(network){
  this.network = network;
}

Switchboard.ensure_channel = function(channel){
  if(!this.channels[channel]){
    this.channels[channel] = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      maxListeners: 0
    })
  }
  
  return this.channels[channel];
}

Switchboard.broadcast = function(channel, routingKey, message){
  console.log('-------------------------------------------');
  console.log('broadcast');
  eyes.inspect(channel);
  eyes.inspect(routingKey);
  var emitter = this.ensure_channel(channel);
  emitter.emit(routingKey, message);
}

Switchboard.listen = function(channel, routingKey, fn){
  console.log('-------------------------------------------');
  console.log('listen');
  eyes.inspect(channel);
  eyes.inspect(routingKey);
  
  var emitter = this.ensure_channel(channel);
  emitter.on(routingKey, fn);
}

Switchboard.remove = function(channel, routingKey, fn){
  console.log('-------------------------------------------');
  console.log('remove');
  eyes.inspect(channel);
  eyes.inspect(routingKey);
  
  var emitter = this.ensure_channel(channel);
  routingKey && emitter.removeListener(routingKey, fn);
}

Switchboard.removeAll = function(channel, routingKey){
  console.log('-------------------------------------------');
  console.log('remove all');
  eyes.inspect(channel);
  eyes.inspect(routingKey);
  
  var emitter = this.ensure_channel(channel);
  routingKey && emitter.removeAllListeners(routingKey);
}