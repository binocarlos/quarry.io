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
var log = require('logule').init(module, 'JSON Server');

module.exports = RPCServer;

/*
  Quarry.io - RPC Server
  ----------------------

  string server that sends request ids back for the client to trigger a callback

  

 */

function RPCServer(options){
  EventEmitter.call(this);
  
  this.options = options || {};

  log.info('creating rpc server');

  if(!options.socket){
    throw new Error('RPCServer requires a socket');
  }

  this.socket = options.socket;

  this.socket.on('message', _.bind(this.handle, this));
}

util.inherits(RPCServer, EventEmitter);

RPCServer.prototype.bind = function(endpoint){
  log.info(dye.red('binding') + ' RPC: ' + dye.red(endpoint));
  this.socket.bindSync(endpoint);
}

RPCServer.prototype.connect = function(endpoint){
  log.info(dye.magenta('connecting') + ' RPC: ' + dye.magenta(endpoint));
  this.socket.connect(endpoint);
}

/*

  register the callback function for JSON requests
  
*/
RPCServer.prototype.handle = function(){
  var self = this;
  var args = _.map(_.toArray(arguments), function(arg){
    return arg.toString();
  })

  var data = args.pop();
  data = this.options.json ? JSON.parse(data) : data;

  var replyargs = [].concat(args);

  function response(data){

    /*
    
      grab the response
      
    */
    data = self.options.json ? JSON.stringify(data) : data;
    replyargs.push(data);

    /*
    
      get it sent back to the client
      
    */
    self.socket.send(replyargs);
  }
  /*
  
    append the callback function after the arguments
    
  */
  
  self.emit.apply(self, ['message', data, response]);

}