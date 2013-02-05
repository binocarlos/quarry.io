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
var Portal = require('../container/portal');
var log = require('logule').init(module, 'Supply Chain');
var Device = require('./device');
var async = require('async');
var eyes = require('eyes');
var contract = require('../contract');
var _ = require('lodash');

/*

  quarry.io - supply chain

  the bridge between container land and actual network connections


  
*/

module.exports = function(stack_id, stack_path, skeleton){

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
          Device.clientfactory(stack_id + ':switchboard', next)
        },
        rpc:function(next){
          Device.clientfactory(stack_id + ':' + stack_path, next);
        }
      }, function(error, network){

        var useskeleton = {
          quarrysupplier:stack_path || '/'
        }

        if(skeleton){
          /*
          
            if the skeleton is a string then it's a quarryid
            
          */
          if(_.isString(skeleton)){
            useskeleton.quarryid = skeleton;
          }
          else{
            _.extend(useskeleton, skeleton);
          }
        }
        else{
          useskeleton.supplychainroot = true;
        }

        var container = Container.new({
          meta:useskeleton
        })
        
        var supplychain = function(req, res, next){

          log.info('supplychain send: ' + req.summary());
          var packet = JSON.stringify(req.toJSON());

          network.rpc(packet, function(answerpacket){
            res.fill(answerpacket);
          })
        }

        /*
        
          merge the switchboard into the supplychain and provide it
          to the container
          
        */
        supplychain.switchboard = network.switchboard;
        container.supplychain = supplychain;

        callback(container);
      })
      
    },

    /*
    
      spark an RPC server feeding into the supplier
      
    */
    bind:function(supplier, callback){

      async.parallel({
        switchboard:function(next){
          Device.clientfactory(stack_id + ':switchboard', next);
        },
        rpc:function(next){
          Device.serverfactory(stack_id + ':' + stack_path, next);
        }
      }, function(error, network){

        var connection = network.rpc;
        var switchboard = network.switchboard;

        /*
        
          ---------------------------------------------------

          Supply Chain Entry Point

          ---------------------------------------------------
          
        */

        connection.on('message', function(packet, callback){

          var req = contract.request(JSON.parse(packet));

          /*
          
            setup the rpc response and the portal
            response in an async parallel
            
          */
          var res = contract.response(function(){

            callback(JSON.stringify(res.toJSON()));

          })

          /*
          
             this is the initial spark for a request entering this supplychain
            
          */
          function bootstrap_request(bootstrapreq){
            /*
          
              when a request ends up server side we stamp it with the stackpath
              which a supplier can then use to stamp containers with the route

              this is used by handlers to know where on the stack we are being invoked from
              
            */
            if(!bootstrapreq.getHeader('x-quarry-supplier')){
              bootstrapreq.setHeader('x-quarry-supplier', stack_path);  
            }

            if(!bootstrapreq.getHeader('x-quarry-stack')){
              bootstrapreq.setHeader('x-quarry-stack', stack_id);
            }
            
            /*
            
              setup the switchboard onto requests so we can do server side
              portal broadcasts
              
            */
            if(!bootstrapreq.switchboard){
              bootstrapreq.switchboard = switchboard;
            }
            
            /*
            
              hookup the bootstrap feature for sub-requests
              
            */
            bootstrapreq.on('bootstrap', bootstrap_request);
          }

          bootstrap_request(req);
          
          supplier(req, res, function(){
            res.send404();
          })
        })

        callback();
      })

    }
  }

}