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
var utils = require('../../../utils');
var eyes = require('eyes');
var _ = require('lodash');
var deck = require('deck');
var log = require('logule').init(module, 'Socket Combo');
var dye = require('dye');
/*

  quarry.io - Socket Combo

  represents a bunch of sockets to various endpoints
  
*/

module.exports = factory;
module.exports.closure = true;
module.exports.async = false;

function factory(options){

  options = _.defaults(options || {}, {
    heartbeat:function(){
      return {
        alive:true
      }
    }
  })

  var sockets = {};

  /*
  
    we hijack the the incoming socket id and replace it with a quasi
    one that maps our socket and the connecting socket
    
  */
  var replyfunctions = {};
  var usesocket = null;
  
  function ensuresocket(){
    if(options.mode!='select'){
      return;
    }

    if(!usesocket){
      var sock = deck.pick(_.values(sockets));

      sock && (usesocket = sock);

      return sock;
    }
    else{
      return null;
    }
  }

  var counter = 0;

  var combo = {

    /*
    
      the sockets by their id
      
    */


    add:function(id, socket){
      var self = this;
      sockets[id] = socket;

      socket._quarryid = id;
      log.info(dye.yellow('Add Socket: ' + socket.identity + ' --- ' + id))

      /*
      
        we do a loop announcing ourselves to the reception back end
        to keep it's router fresh

      */
      

      function socketheartbeat(){
        /*
        
          the socket has been removed - that reception has been taken down
          
        */
        if(!sockets[id]){
          return;
        }

        var socket = sockets[id];

        var data = options.heartbeat();
        data.counter = counter++;

        // the id of the particular reception socket
        var reverseid = id + ':back';

        socket.send([reverseid, 'heartbeat', JSON.stringify(data)]);

        setTimeout(socketheartbeat, 1000);
      }

      socketheartbeat();
      
      /*
      
        we listen to events on all sockets
        
      */
      
      socket.on('message', function(){
        var args = _.toArray(arguments);

        var socketid = args.shift();
        var replyid = args[0].toString();

        var replyfunction = function(args){
          args.unshift(socketid);
          socket.send(args)
        }

        counter++;

        replyfunctions[replyid] = replyfunction;
        args.unshift('message');
        self.emit.apply(self, args);
      })
      
    },

    remove:function(id){
      delete(sockets[id]);
    },

    /*
    
      we pick the socket we want to send down
      
    */
    send:function(args){
      var replyid = args[0];
      if(replyfunctions[replyid]){
        replyfunctions[replyid](args);
        delete(replyfunctions[replyid]);
      }
    }

    
  }

  _.extend(combo, EventEmitter.prototype);

  return combo;
}