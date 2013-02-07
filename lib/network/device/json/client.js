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
var Proto = require('../proto');

module.exports = JSONClient;

/*
  Quarry.io - JSON Client
  -----------------------

  DEALER socket that parses JSON requests with callbacks

  

 */

function JSONClient(options){
  Proto.apply(this, [options]);

  log.info('creating json client');

  /*
  
    keep a register of the callback functions by id
    
  */
  this.callbacks = {};

  this.socket = this.get_socket('dealer');
  this.socket.on('message', _.bind(this.handle, this));
}

util.inherits(JSONClient, Proto);

/*

   in bind mode we are a single socket
  
*/
JSONClient.prototype.bind = function(){
  log.info(dye.magenta('binding') + ' RPC: ' + dye.red(this.endpoints.rpc));
  this.socket.bindSync(this.endpoints.rpc);
  return this;
}

/*

  in connect mode we have multiple endpoints to connect to

  this is how we branch out across lots of middlepoints
  
*/
JSONClient.prototype.connect = function(){
  log.info(dye.magenta('connecting') + ' RPC: ' + dye.red(this.endpoints.rpc));
  this.socket.connect(this.endpoints.rpc);
  return this;
}

JSONClient.prototype.send = function(){
  var args = _.toArray(arguments);
      
  var callback = args.pop();

  args[args.length-1] = JSON.stringify(args[args.length-1]);

  var requestid = utils.quarryid();
  this.callbacks[requestid] = callback;

  args.unshift(requestid);

  log.info('rpc socket send: ' + requestid);

  this.socket.send(args);
}

/*

  register the callback function for JSON requests
  
*/
JSONClient.prototype.handle = function(){
  var self = this;
  var args = _.map(_.toArray(arguments), function(arg){
    return arg.toString();
  })
  var requestid = args.shift();
  args[args.length-1] = JSON.parse(args[args.length-1]);
  var callback = this.callbacks[requestid];
  if(callback){
    delete(self.callbacks[requestid]);
    callback.apply(null, args);
  }

}