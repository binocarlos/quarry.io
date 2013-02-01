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

var Container = require('../container');
var Portal = require('./portal');
var log = require('logule').init(module, 'Supply Chain');
var Device = require('./device');
var async = require('async');
var eyes = require('eyes');
var msgpack = require('msgpack');
var contract = require('../contract');
/*

  quarry.io - supply chain

  the bridge between container land and actual network connections


  
*/

module.exports = function(stack_id, stack_path){

  return {

    /*
    
      return a client that is connected to a transport
      that in turn is connected to a server transport
      on the other end

      this lets us RPC (transport())
      and PUB/SUB transport.on / transport.emit

      transport is a client hooked up to:

        RPC - handler(req, res, next)
        Switchboard - stack switchboard client
        HTTP - http proxy to endpoint
      
    */
    connect:function(callback){

      async.parallel({
        switchboard:function(next){
          Device.clientfactory(stack_id + ':switchboard', function(error, switchboard){
            next(null, switchboard);
          })
        },
        rpc:function(next){
          Device.clientfactory(stack_id + ':' + stack_path, function(error, connection){
            next(null, connection);
          })
        }
      }, function(error, network){

        var container = Container.new('supplychain');
        container.route('normal', stack_path || '/');
        container.supplychain = function(req, res, next){

          log.info('supplychain send: ' + req.summary());
          var packet = JSON.stringify(req.toJSON());

          network.rpc(packet, function(answerpacket){
            res.fill(answerpacket);
          })
        }

        container.switchboard = network.switchboard;

        callback(container);
      })
      
    },

    /*
    
      spark an RPC server feeding into the supplier
      
    */
    bind:function(supplier, callback){

      async.parallel({
        switchboard:function(next){
          Device.clientfactory(stack_id + ':switchboard', function(error, switchboard){
            next(null, switchboard);
          })
        },
        rpc:function(next){
          Device.serverfactory(stack_id + ':' + stack_path, function(error, connection){
            next(null, connection);
          })
        }
      }, function(error, network){


        var connection = network.rpc;
        var switchboard = network.switchboard;
        /*
        
          hook up the RPC
          
        */
        connection.on('message', function(packet, callback){
          var req = contract.request(JSON.parse(packet));
          var res = contract.response(function(){
            callback(JSON.stringify(res.toJSON()));
          })
          req.switchboard = switchboard;
          supplier(req, res, function(){
            res.send404();
          })
        })

        callback();
      })

    }
  }
}