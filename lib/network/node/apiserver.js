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
var SwitchboardClient = require('./client/switchboard');
var ReceptionBack = require('./client/receptionback');
var Warehouse = require('../../warehouse');
var Supplier = require('../../supplier');
var async = require('async');

var io = require('../../../index');
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

  async.series([

    /*
    
      make a clustered switchboard client
      
    */
    function(next){

      SwitchboardClient(self.db, function(error, client){
        self.switchboard = client;

        next();
      })

    },

    function(next){

      /*
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      ReceptionBack({
        db:self.db
      }, function(error, socket){
        self.socket = socket;
        next();
      })
    },

    function(next){

      /*
      
        the multiplexing socket connected to each reception
        
      */
      var reception_back_socket = self.socket;
      
      /*
      
        the holding place for the api mounts
        
      */

      var baseroute = node.attr('stackpath') || '';
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
        stackid:node.attr('stackid')
      })

      rpcserver.on('message', supplychain.handle);

      /*
      
        now build up each service
        
      */

      async.forEach(node.attr('services'), function(service, nextservice){
        /*
        
          is it a custom module
          
        */
        if(!service.module.match(/^quarry\./)){
          var codepath = self.codepath(service.module);

          var loadedmodule = require(codepath);

          var fn = loadedmodule(service.options || {}, io);

          var wrapper = supplychain.wrapper(service.route, fn);

          service.route=='/' ? supplychain.use(wrapper) : supplychain.use(service.route, wrapper);

          log.info('Mounting API Server Module: ' + dye.red(service.route) + ' - ' + dye.yellow(service.module));
        }
        /*
        
          no it's a quarry supplier
          
        */
        else{
          var fn = Supplier(service.module, service.options);
          var wrapper = supplychain.wrapper(service.route, fn);

          service.route=='/' ? supplychain.use(wrapper) : supplychain.use(service.route, wrapper);

          log.info('Mounting API Server Supplier: ' + dye.red(service.route) + ' - ' + dye.yellow(service.module));
        }

        nextservice();

      }, callback)
      
    }

  ], function(){

    callback();
  })
  
}