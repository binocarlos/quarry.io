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
var ZMQRPC = require('./zeromq/server/rpc');
var ZMQPubSub = require('./zeromq/server/pubsub');

/*
  Quarry.io - Gateway
  -------------------

  The overall entry point for a network

  This will decide what stack to route to based on hostname (virtual hosting)


 */
module.exports = Gateway;
/*


  Constructor




 */

function Gateway(options){
  options || (options = {});
  /*
  
    the ports we are running our servers on
    
  */
  this.ports = options.ports;

  /*
  
    the function that will provide us with a client to the internal network
    
  */
  this.client_provider = options.client_provider;

  /*
  
    a cache of the clients that have already been accessed
    
  */
  this.clients = {};
}

Gateway.prototype.httpproxy = function(req, res, next){
  console.log('-------------------------------------------');
  console.log('http req');
}

Gateway.prototype.rpcproxy = function(req, res, next){
  console.log('-------------------------------------------');
  console.log('rpc req');
}

Gateway.prototype.bind = function(callback){
  var self = this;
  this.rpc = new ZMQRPC(this.ports);
  this.pubsub = new ZMQPubSub(this.ports);

  this.rpc.on('message', function(message, callback){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('RPC entry point');
    eyes.inspect(message);
  })

  this.pubsub.on('message', function(message){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('PUBSUB entry point');
    eyes.inspect(message);
  })

  async.series([
    function(next){
      console.log('-------------------------------------------');
      console.log('Gateway RPC server listening: ');
      eyes.inspect(self.ports);
      next();
    },
    function(next){
      console.log('-------------------------------------------');
      console.log('booting RPC');
      self.rpc.bind(next);
    },
    function(next){
      console.log('-------------------------------------------');
      console.log('booting PUBSUB');
      self.pubsub.bind(next);
    }
  ], callback);
  
}