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
var log = require('logule').init(module, 'Switchboard Client');
var Proto = require('../proto');

module.exports = SwitchboardClient;

/*
  Quarry.io - Switchboard Client
  ------------------------------

  talk to the switchboard server - this is like a crossover cable

  client (sub <- pub) server
                        ^
                        |
                        |
  client (pub -> sub) server

  

 */

function SwitchboardClient(options){
  Proto.apply(this, [options]);

  log.info('creating switchboard server');

  var self = this;

  /*
  
     the map of callbacks against routing keys
    
  */
  this.callbacks = {};

  this.pub = this.get_socket('pub');
  this.sub = this.get_socket('sub');

  this.sub.on('message', _.bind(this.handle, this));
}

util.inherits(SwitchboardClient, Proto);

/*

   in bind mode we are a single socket
  
*/
SwitchboardClient.prototype.connect = function(){
  log.info(dye.magenta('connecting') + ' PUB: ' + dye.red(this.endpoints.sub));
  this.pub.connect(this.endpoints.sub);
  log.info(dye.magenta('connecting') + ' SUB: ' + dye.red(this.endpoints.pub));
  this.sub.connect(this.endpoints.pub);
  return this;
}

/*

  we have got a message
  turn it into a string and extract the routing key

  then - we split the routing key by '.' and loop backwards
  through the parts to trigger any listeners based on that key
  
*/
SwitchboardClient.prototype.handle = function(packetbuffer){
  var self = this;
  var packetstring = packetbuffer.toString();

  var routingkey = packetstring.substr(0,packetstring.indexOf(' '));
  var messagestring = packetstring.substr(packetstring.indexOf(' ')+1);

  var message = JSON.parse(messagestring);

  var parts = routingkey.split('.');

  var allfns = [];
  while(parts.length>0){
    var callbackarray = self.callbacks[parts.join('.')];
    callbackarray && (allfns = allfns.concat(callbackarray));
    parts.pop();
  }

  _.each(allfns, function(fn){
    fn(message);
  })
}

SwitchboardClient.prototype.listen = function(routing_key, fn){

  if(!fn){
    fn = routing_key;
    routing_key = '*';
  }

  log.info('Portal listen: ' + dye.yellow(routing_key));

  this.sub.subscribe(routing_key);

  this.callbacks[routing_key] || (this.callbacks[routing_key] = []);
  this.callbacks[routing_key].push(fn);

  return this;
}

SwitchboardClient.prototype.cancel = function(routing_key, fn){

  var self = this;
  function removekey(){
    self.sub.unsubscribe(routing_key);
    delete(self.callbacks[routing_key]);
  }

  if(!fn){
    removekey();
  }
  else{
    this.callbacks[routing_key] = _.filter(this.callbacks[routing_key], function(callback){
      return callback!==fn;
    })

    if(this.callbacks[routing_key].length<=0){
      removekey();
    }
  }

  return this;
}

SwitchboardClient.prototype.broadcast = function(routing_key, packet){

  log.info('Portal broadcast: ' + dye.yellow(routing_key));

  this.pub.send(routing_key + ' ' + JSON.stringify(packet));

  return this;
}