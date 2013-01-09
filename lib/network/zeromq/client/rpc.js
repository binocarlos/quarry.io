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
var eyes = require('eyes');
var Emitter = require('events').EventEmitter;
var Client = require('../client');
var Response = require('../../../query/response');

module.exports = RPCClient;


/*
  Quarry.io - Local - PubSub
  -----------------------

  ZeroMQ server for warehouse PubSub


 */

function RPCClient(ports){

  Client.apply(this, [ports]);

  var self = this;

  // keep track of the callbacks via the request id
  this.callbacks = {};
}

RPCClient.prototype.__proto__ = Client.prototype;

RPCClient.prototype.build_sockets = function(){
  this.rpc = this.add_socket('dealer', this.ports.rpc);

  this.rpc.on('message', _.bind(this.handle_answer, this));    
}

RPCClient.prototype.handle = function(req, res, next){

  this.callbacks[req.id] = function(data){
    /*
    
      we raw assign the response - the details has been worked
      out the other end
      
    */
    res.set(data);
    res.send();
  }

  console.log('-------------------------------------------');
  console.log('handle');
  console.log(JSON.stringify(req.toJSON()));
  this.rpc.send(JSON.stringify(req.toJSON(), null, 4));
}

RPCClient.prototype.handle_answer = function(string){
  var data = JSON.parse(string);

  var fn = this.callbacks[data.id];

  if(!fn){
    return;
  }

  delete(this.callbacks[data.id]);

  fn(data);
}