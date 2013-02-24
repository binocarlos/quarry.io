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
var eyes = require('eyes');
var _ = require('lodash');
var async = require('async');
var Node = require('./proto');
var log = require('logule').init(module, 'Web Server');
var Device = require('../device');

var Server = require('../../webserver');

/*

  quarry.io - web node

  virtual host for web servers
  
*/

module.exports = WebServer;

/*

  skeleton network config
  
*/

function WebServer(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(WebServer, Node);

WebServer.prototype.boot = function(callback){


  this.switchboard = null;

  var self = this;
  var spark = this.spark;
  var node = this.node;
  var worker = this.worker;

  async.series([

    /*
    
      make a clustered switchboard client
      
    */
    function(next){

      Device('switchboard.multiclient', {
        db:self.db
      }, function(error, client){
        self.switchboard = client;

        next();
      })

    },

    /*
    
      get a connection to the Redis cache
      
    */
    function(next){

      Device('cache.client', worker.system.servers.redis, function(error, cacheclient){
        self.cache = cacheclient;
        next();
      })

    },

    function(next){

      /*
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      Device('reception.frontconnection', {
        db:self.db
      }, function(error, socket){
        self.socket = socket;
        next();
      })
    },

    function(next){

      /*
      
        the dealer socket that is load-balancing to reception servers
        
      */
      var reception_front_socket = self.socket;

      /*
      
        connect the backend reception socket to the JSON RPC
        
      */
      var rpcclient = Device('rpc.client', {
        json:true,
        socket:reception_front_socket
      })

      /*
      
        then we have a supply chain connected through to reception back
        
      */
      var supplychain = Device('supplychain.client', {
        switchboard:self.switchboard,
        stackid:node.attr('stackid'),
        rpc:rpcclient
      })

      //supplychain.on('request', _.bind(rpcclient.send, rpcclient));

      self.supplychain = supplychain;

      next();

    },

    function(next){

      /*
      
        make the system for the middleware to use
        
      */
      var system = {
        id:worker.stackid,
        supplychain:self.supplychain,
        httpproxy:self.socket.http,
        switchboard:self.switchboard,
        cache:self.cache,
        endpoint:self.spark.attr('endpoints').http,
        codepath:_.bind(self.codepath, self),
        worker:worker        
      }

      self.server = Server(self.node, system);
      
      /*
      
        pass the system into each website for it's middleware
        
      */
      self.server.load_websites(next);
    },

    function(next){

      self.server.bind(next);
      
    }

  ], function(){

    callback();
  })
  
}