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

function factory(options){

  options = _.defaults(options || {}, {
    
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

  var combo = {

    /*
    
      the sockets by their id
      
    */


    add:function(id, socket){
      sockets[id] = socket;

      socket._quarryid = id;
      log.info(dye.yellow('Add Socket: ' + socket.identity + ' --- ' + id))

      /*
      
        we listen to events on all sockets
        
      */
      
      socket.on('message', function(){
        var args = _.toArray(arguments);

        var socketid = args.shift();

        var replyid = utils.quarryid();

        var replyfunction = function(args){
          args.unshift(socketid);
          socket.send(args)
        }

        replyfunctions[replyid] = replyfunction;
        args.unshift(replyid);
        args.unshift('message');
        combo.emit.apply(combo, args);
      })
      
    },

    remove:function(id){
      delete(sockets[id]);
    },

    /*
    
      we pick the socket we want to send down
      
    */
    send:function(){
      var args = _.toArray(arguments);
      var replyid = args.shift();
      if(replyfunctions[replyid]){
        replyfunctions[replyid](args);
        delete(replyfunctions[replyid]);
      }
    }

    
  }

  _.extend(combo, EventEmitter.prototype);

  return combo;
}