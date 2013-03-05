/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
var Device = require('../../device');

module.exports = factory;

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


function factory(options){

  options || (options = {});
  options.name || (options.name = 'switchboard_client');

  var pub = _.extend({}, options.pub, {
    address:options.sub.address
  })
  var sub = _.extend({}, options.sub, {
    address:options.pub.address
  })
  var device = Device('core.box', {
    name:options.name,
    wires:{
      pub:pub,
      sub:sub
    }
  })

  device.callbacks = {};

  device.wires.sub.on('message', _.bind(handle, device));
  /*
  
    inject each of the functions below into the context of the device
    so this.callbacks points to the instance variable above (same with wires)
    
  */
  device.broadcast = _.bind(broadcast, device);
  device.listen = _.bind(listen, device);
  device.cancel = _.bind(cancel, device);
  
  return device;
}

/*

  we have got a message
  turn it into a string and extract the routing key

  then - we split the routing key by '.' and loop backwards
  through the parts to trigger any listeners based on that key
  
*/
function handle(packetbuffer){
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

function broadcast(routing_key, packet){
  this.wires.pub.send(routing_key + ' ' + JSON.stringify(packet));
  return this;
}

function listen(routing_key, fn){

  if(!fn){
    fn = routing_key;
    routing_key = '*';
  }

  this.wires.sub.subscribe(routing_key);

  this.callbacks[routing_key] || (this.callbacks[routing_key] = []);
  this.callbacks[routing_key].push(fn);

  return this;
}

function cancel(routing_key, fn){

  var self = this;
  function removekey(){
    self.wires.sub.unsubscribe(routing_key);
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