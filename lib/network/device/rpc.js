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
var utils = require('../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var transport = require('./transport/zeromq');
var log = require('logule').init(module, 'RPC Device');

/*
  Quarry.io - RPC Device
  ----------------------

  REQ / REP pair (DEALER / ROUTER because node is async)

  




 */

var RPC = module.exports = {

  /*
  
    create an RPC client

    options:

      address
      connect/bind

    
   */
  client:function(options){

    var callbacks = {};

    var socket = transport(options.id + ':REQ', 'dealer');

    socket.on('message', function(){
      var args = _.map(_.toArray(arguments), function(arg){
        return arg.toString();
      })
      var requestid = args.shift();
      var callback = callbacks[requestid];
      if(callback){
        delete(callbacks[requestid]);
        callback.apply(null, args);
      }
    })

    /*
    
      either connect or bind the client
      
    */
    log.info('creating RPC Client: ' + dye.green(options.id));

    log.info(dye.magenta(options.host || options.bind ? 'binding' : 'connecting') + ' REQ: ' + dye.red(options.sockets.rpc));

    options.host || options.bind ? socket.bindSync(options.sockets.rpc) : socket.connect(options.sockets.rpc);

    /*
    
      return the client RPC function via which we can run packets
      
    */
    return function(){

      var args = _.toArray(arguments);
      
      var callback = args.pop();

      var requestid = utils.quarryid();
      callbacks[requestid] = callback;

      args.unshift(requestid);

      log.info('rpc socket send: ' + requestid);
      
      socket.send.apply(socket, [args]);
    }

  },

  server:function(options){

    var socket = transport(options.id + ':REP', 'router');

    

    function rpcserver(){}

    _.extend(rpcserver, EventEmitter.prototype);

    socket.on('message', function(){

      var socketid = arguments[0];
      var requestid = arguments[1];

      var args = _.map(Array.prototype.slice.apply(arguments, [2]), function(arg){
        return arg.toString();
      })

      /*
      
        append the callback function after the arguments
        
      */
      args.push(function(){

        var replyargs = _.toArray(arguments);
        replyargs.unshift(requestid);
        replyargs.unshift(socketid);

        socket.send(replyargs);
      })

      /*
      
        message is really for the emit method
        
      */
      args.unshift('message');
      rpcserver.emit.apply(rpcserver, args);

    })

    /*
    
      either connect or bind the client
      
    */
    log.info('creating RPC Server: ' + dye.green(options.id));

    if(options.host || options.bind){
      log.info(dye.magenta('binding') + ' RPC: ' + dye.red(options.sockets.rpc));
      socket.bindSync(options.sockets.rpc);
    }
    else{
      log.info(dye.magenta('connecting') + ' RPC: ' + dye.red(options.sockets.rpc));
      socket.connect(options.sockets.rpc); 
    }

    return rpcserver;

  }
}