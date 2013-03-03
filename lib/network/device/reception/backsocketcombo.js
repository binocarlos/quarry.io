/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
var dye = require('dye');
/*

  quarry.io - Socket Combo

  represents a bunch of sockets to various endpoints
  
*/

module.exports = factory;
module.exports.closure = true;
module.exports.async = false;

/*

  
  
*/
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