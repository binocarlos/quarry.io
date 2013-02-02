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
          Device.clientfactory(stack_id + ':switchboard', next)
        },
        rpc:function(next){
          Device.clientfactory(stack_id + ':' + stack_path, next);
        }
      }, function(error, network){

        var container = Container.new('supplychain');
        container.route('normal', stack_path || '/');

        var supplychain = function(req, res, next){

          log.info('supplychain send: ' + req.summary());
          var packet = JSON.stringify(req.toJSON());

          network.rpc(packet, function(answerpacket){
            res.fill(answerpacket);
          })
        }

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
          var res = contract.response(function(){
            callback(JSON.stringify(res.toJSON()));
          })

          function bootstrap_request(bootstrapreq){
            /*
          
              when a request ends up server side we stamp it with the stackpath
              which a supplier can then use to stamp containers with the route
              
            */
            if(!bootstrapreq.getHeader('x-quarry-route')){
              bootstrapreq.setHeader('x-quarry-route', stack_path);  
            }
            
            /*
            
              insert the stackpath into the container routes
              
            */
            bootstrapreq.on('stamp', function(data){
              if(!_.isArray(data)){
                data = [data];
              }
              _.each(data, function(result){
                result.meta || (result.meta = {});
                result.meta.routes || (result.meta.routes = {});
                result.meta.routes.normal || (result.meta.routes.normal = bootstrapreq.getHeader('x-quarry-route'));
              })
            })

            /*
            
              let the request communiate to the switchbaord
              
            */
            bootstrapreq.on('portal', function(portalres){

              var portaldata = portalres.getHeader('x-json-portal');

              var skeleton = portaldata.requestheaders['x-json-skeleton'];
              var target = Container.fromskeleton(skeleton);

              var portal = new Portal(target, switchboard);

              portal.broadcast(portaldata.routingkey, portalres.toJSON());

            })

            req.bootstrap = bootstrap_request;
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