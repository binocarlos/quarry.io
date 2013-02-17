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

var Node = require('./proto');
var log = require('logule').init(module, 'API Server');
var dye = require('dye');
var Device = require('../device');

var Warehouse = require('../../warehouse');
var Supplier = require('../../supplier');
var async = require('async');

/*

  quarry.io - web node

  virtual host for web servers
  
*/

module.exports = APIServer;

/*

  skeleton network config
  
*/

function APIServer(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(APIServer, Node);

APIServer.prototype.boot = function(callback){

  this.switchboard = null;

  var self = this;
  var spark = this.spark;
  var node = this.node;
  var worker = this.worker;

  /*
  
    the stackpath is worked out by the allocation

    at the beginning - all nodes are allocated to the default
    worker which has the root stack path '/'

    further stack routing happens wuthin the supplychain warehouse
    
  */
  var stackpath = node.hasClass('default') ? '/' : node.attr('stackpath');

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
      Device('http.server',{
        port:spark.attr('endpoints').http.port
      }, function(error, server){
        self.httpserver = server;
        next();
      })
    },


    function(next){

      /*
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      Device('reception.backconnection', {
        db:self.db,
        heartbeat:{
          nodeid:node.quarryid(),
          sparkid:spark.quarryid(),
          stackpath:stackpath,
          endpoints:spark.attr('endpoints')  
        }
      }, function(error, socket){
        self.receptionback = socket;
        next();
      })
    },


    function(next){

      /*
      
        the multiplexing socket connected to each reception
        
      */
      var reception_back_socket = self.receptionback;

      /*
      
        this we announce to the back socket as to our stack route
        
      */
      var stackpath = node.attr('stackpath') || '';

      /*
      
        the holding place for the api mounts
        
      */
      var warehouse = Warehouse();

      /*
      
        connect the backend reception socket to the JSON RPC
        
      */
      var rpcserver = Device('rpc.server', {
        json:true,
        socket:reception_back_socket
      })

      /*
      
        then we have a supply chain connected through to reception back
        
      */
      var supplychain = Device('supplychain.server', {
        switchboard:self.switchboard,
        stackid:node.attr('stackid'),
        rpc:rpcserver
      })

      /*
      
        we pass this into the api handlers so they have access to the system tings
        
      */
      var system = {
        id:worker.stackid,
        cache:self.cache,
        worker:worker
      }

      //rpcserver.on('message', supplychain.handle);

      /*
      
        now build up each service
        
      */

      async.forEach(node.attr('services'), function(service, nextservice){

        var module = service.module;
        var route = service.mount;

        /*
        
          this will become the Quarry handler
          
        */
        var quarryfn = null;

        /*
        
          this will become the http handler (if defined)
          
        */

        var httpfn = null;

        var moduleoptions = _.extend({}, service);

        /*
        
          is it a custom module
          
        */
        if(!module.match(/^quarry\./)){

          var codepath = self.codepath(module);

          var loadedmodule = require(codepath);

          fn = loadedmodule(moduleoptions, system);
        }
        /*
        
          no it's a quarry supplier
          
        */
        else{
          fn = Supplier(module, moduleoptions, system);
        }

        var wrapper = supplychain.wrapper(route, fn);

        /*
        
          mount the quarryfn on the supply chain
          
        */
        route=='/' ? supplychain.use(wrapper) : supplychain.use(route, wrapper);

        log.info('Mounting API Server Supplier: ' + dye.red(route) + ' - ' + dye.yellow(module));

        /*
        
          check to see if we are provided with a http handler - mount it if so
          
        */

        if(fn.http){
          log.info('Mounting API Server HTTP Handler: ' + dye.red(route) + ' - ' + dye.yellow(module));

          route=='/' ? self.httpserver.use(fn.http) : self.httpserver.use(route, fn.http);     
        }

        nextservice();

      }, next)
      
    },

    function(next){
      self.httpserver.bind(next);
    }

  ], function(){

    callback();
  })
  
}