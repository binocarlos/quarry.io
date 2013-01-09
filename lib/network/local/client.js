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
var utils = require('../../utils');
var eyes = require('eyes');
var Base = require('../client');

var ZMQRPC = require('../zeromq/client/rpc');
var ZMQPubSub = require('../zeromq/client/pubsub');

module.exports = Base.extend({

  clients:{},

  get_allocation:function(path){
    var allocations = this.get('allocations');

    return allocations[path];
  },

  ensure_client:function(path, creator, callback){
    if(clients[path]){
      callback(null, clients[path]);
      return;
    }

    creator(function(error, client){
      clients[path] = client;
      callback(null, clients[path]);
    })
  },

  /*
    Produce a supply chain that points to a given node
   */
  rpc:function(path){

    var self = this;

    return function(req, res, next){


      self.ensure_client(path, function(callback){

        var allocation = self.get_allocation(path);

        var client = new ZMQRPC(allocation.ports);

        client.connect();

        callback(null, client);

      }, function(error, client){
        if(error){
          res.sendError(error);
          return;
        }
        else{
          client.request(req.toJSON(), function(error, result){
            if(error){
              res.sendError(error);
            }
            res.set(result);
            res.send();
          })
        }
      })

/*
      var server = singleton.rpc(self.get('stack_id'), path);

      if(!server){
        res.send404();
        return;
      }

      server(req, res, next);
*/      
    }
    
    
  },

  pubsub:function(path){
    var self = this;

    var allocation = this.get_allocation(path);

    if(!allocation){
      throw new Error('no allocation for: ' + path);
    }

    var client = new ZMQPubSub(allocation.ports);

    client.connect();

    return client;
  }
})