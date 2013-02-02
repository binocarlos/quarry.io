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
var dye = require('dye');
var EventEmitter = require('events').EventEmitter;
var log = require('logule').init(module, 'Switchboard Device');
var transport = require('./transport/zeromq');


/*
  Quarry.io - Switchboard Device
  ------------------------------

  PUB/SUB pair

  




 */

var Switchboard = module.exports = {

  /*
  
    create an RPC client

    options:

      address
      connect/bind

    
   */
  client:function(options){

    var sub = transport(options.id + ':SUB', 'sub');
    var pub = transport(options.id + ':PUB', 'pub');

    var callbacks = {};

    sub.on('message', function(packet){
      var routingkey = packet.substr(0,packet.indexOf(' '));
      var packet = packet.substr(packet.indexOf(' ')+1);

      callbackarray = callbacks[routingkey];

      _.each(callbackarray, function(fn){
        fn(packet);
      })
    })

    /*
    
      either connect or bind the client
      
    */


    log.info('creating PUB/SUB Client: ' + dye.green(options.id));

    log.info(dye.magenta('connecting') + ' SUB: ' + dye.red(options.sockets.pub));
    sub.connect(options.sockets.pub);

    log.info(dye.magenta('connecting') + ' PUB: ' + dye.red(options.sockets.sub));
    pub.connect(options.sockets.sub);    

    /*
    
      return the client RPC function via which we can run packets
      
    */
    return {
      listen:function(routing_key, fn){

        if(!fn){
          fn = routing_key;
          routing_key = '*';
        }

        if(options.basekey){
          routing_key = options.basekey + '.' + routing_key;
        }

        log.info('Portal listen: ' + dye.yellow(routing_key));

        sub.subscribe(routing_key);

        callbacks[routing_key] || (callbacks[routing_key] = []);
        callbacks[routing_key].push(fn);

      },

      cancel:function(routing_key, fn){

        if(options.basekey){
          routing_key = options.basekey + '.' + routing_key;
        }

        function removekey(){
          sub.unsubscribe(routing_key);
          delete(callbacks[routing_key]);
        }

        if(!fn){
          removekey();
        }
        else{
          callbacks[routing_key] = _.filter(callbacks[routing_key], function(callback){
            return callback!==fn;
          })

          if(callbacks[routing_key].length<=0){
            removekey();
          }
        }
      },

      broadcast:function(routing_key, packet){

        if(options.basekey){
          routing_key = options.basekey + '.' + routing_key;
        }
        
        log.info('Portal broadcast: ' + dye.yellow(routing_key));

        pub.send(routing_key + ' ' + packet);
      }
    }

  },

  server:function(options){

    var sub = transport(options.id + ':SUB', 'sub');
    var pub = transport(options.id + ':PUB', 'pub');

    sub.on('message', function(packet){
      pub.send(packet);
    })

    /*
    
      either connect or bind the client
      
    */

    log.info('creating PUB/SUB Server: ' + dye.green(options.id));

    log.info(dye.magenta('binding') + ' SUB: ' + dye.red(options.sockets.sub));
    sub.bindSync(options.sockets.sub);

    log.info(dye.magenta('binding') + ' PUB: ' + dye.red(options.sockets.pub));
    pub.bindSync(options.sockets.pub);

  }
}