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
  console.log('-------------------------------------------');
  eyes.inspect(node.toJSON());
  console.log('-------------------------------------------');
  eyes.inspect(spark.toJSON());
  process.exit();

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
      ReceptionBack({
        db:self.db
      }, function(error, socket){
        self.socket = socket;
        next();
      })
    },

    function(next){

      /*
      
        the holding place for the api mounts
        
      */

      var baseroute = node.attr('stackpath') || '';
      var warehouse = Warehouse();

      var rpcserver = Device('rpc.server', {
        json:true,
        socket:self.socket
      })

      var supplychain = Device('supplychain.server', {
        switchboard:self.switchboard,
        stackid:node.attr('stackid')
      })

      _.each(node.attr('services'), function(service){
        var fn = function(req, res, next){
          res.send({
            test:243
          })
        }

        log.info('Mounting API Server: ' + dye.red(service.route));

        supplychain.mount(service.route, fn);
      })

      rpcserver.on('message', supplychain.handle);
    }

  ], function(){

    callback();
  })
  
}