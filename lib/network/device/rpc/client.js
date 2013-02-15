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
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var log = require('logule').init(module, 'JSON Client');

module.exports = RPCClient;

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

function RPCClient(options){
  EventEmitter.call(this);
  this.options = options || {};
  log.info('creating rpc client');

  if(!options.socket){
    throw new Error('RPCClient requires a socket');
  }

  /*
  
    keep a register of the callback functions by id
    
  */
  this.callbacks = {};
  this.socket = options.socket;

  this.socket.on('message', _.bind(this.handle, this));
}

util.inherits(RPCClient, EventEmitter);

RPCClient.prototype.bind = function(endpoint){
  log.info(dye.red('binding') + ' RPC: ' + dye.red(endpoint));
  this.socket.bindSync(endpoint);
}

RPCClient.prototype.connect = function(endpoint){
  log.info(dye.magenta('connecting') + ' RPC: ' + dye.magenta(endpoint));
  this.socket.connect(endpoint);
}

RPCClient.prototype.send = function(){
  var args = _.toArray(arguments);
      
  var callback = args.pop();

  //args[args.length-1] = JSON.stringify(args[args.length-1]);

  var requestid = utils.quarryid();
  this.callbacks[requestid] = callback;

  args.unshift(requestid);

  if(this.options.json){
    args[args.length-1] = JSON.stringify(args[args.length-1]);
  }

  log.info('rpc socket send: ' + requestid);

  this.socket.send(args);
}

/*

  register the callback function for JSON requests
  
*/
RPCClient.prototype.handle = function(){
  var self = this;

  var args = _.map(_.toArray(arguments), function(arg){
    return arg.toString();
  })
  var requestid = args.shift();

  if(this.options.json){
    args[args.length-1] = JSON.parse(args[args.length-1]);
  }
  var callback = this.callbacks[requestid];
  if(callback){
    delete(self.callbacks[requestid]);
    callback.apply(null, args);
  }

}