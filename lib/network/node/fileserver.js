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
var async = require('async');
var _ = require('lodash');

var Node = require('./proto');
var log = require('logule').init(module, 'API Server');
var dye = require('dye');
var Device = require('../device');

var FileServerFactory = require('../../fileserver');

/*

  quarry.io - file node

  virtual host for file servers
  
*/

module.exports = FileServer;

/*

  skeleton network config
  
*/

function FileServer(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(FileServer, Node);

FileServer.prototype.boot = function(callback){

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
      Device('reception.backconnection', {
        db:self.db,
        heartbeat:{
          department:'file',
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
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      Device('http.server', {
        port:spark.attr('endpoints').http.port
      }, function(error, httpserver){
        self.httpserver = httpserver;
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
      
        connect the backend reception socket to the JSON RPC
        
      */
      var httpserver = self.httpserver;

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

      async.forEach(node.find('service').containers(), function(service, nextservice){

        var module = service.attr('module');
        var route = service.attr('mount');

        /*
        
          this will become the Quarry handler
          
        */
        var moduleoptions = _.extend({}, service.attr(), {
          stackpath:stackpath
        })

        /*
        
          is it a custom module
          
        */
        if(!module.match(/^quarry\./)){

          throw new Error('unknown fileserver module: ' + module);

        }

        _.each(moduleoptions, function(val, prop){
          if(val.indexOf('__stack.')==0){
            moduleoptions[prop] = system.worker.stack[val.substr('__stack.'.length)];
          }
        })

        var fn = FileServerFactory(module, moduleoptions, system);
        

        /*
        
          mount the quarryfn on the supply chain
          
        */
        log.info('Mounting File Server Supplier: ' + dye.red(route) + ' - ' + dye.yellow(module));

        httpserver.use(route, fn);

        nextservice();

      }, next)
      
    },

    function(next){
      log.info(dye.red('Binding File Server: ' + spark.attr('endpoints').http.port));
      self.httpserver.bind(next);
    }

  ], function(){

    callback();
  })
  
}