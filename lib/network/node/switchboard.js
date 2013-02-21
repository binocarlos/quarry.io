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
var log = require('logule').init(module, 'Switchboard');
var Device = require('../device');

/*

  quarry.io - switchboard node

  the pub/sub server for a stack

  it connects to all the other swithboard servers via a connection
  and listens / publishes like a router
  
*/

module.exports = Switchboard;

/*

  skeleton network config
  
*/

function Switchboard(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(Switchboard, Node);

/*

  hook up one switchboard server that is listening to the others also
  
*/
Switchboard.prototype.boot = function(callback){

  var self = this;
  var endpoints = this.spark.attr('endpoints');

  self.device = Device('switchboard.server', _.extend({
    pub:Device.socket('pub'),
    sub:Device.socket('sub')
  }, self.spark.attr()))

  Device('node.sparkmonitor', {
    db:this.db,
    selector:'group#workers.switchboard',
    ignore_spark:this.spark.quarryid()
  }, function(error, monitor){
    monitor.on('add', function(spark){
      self.device.addspark(spark);
    })

    monitor.on('remove', function(spark){
      self.device.removespark(spark);
    })

    monitor.start(function(){

      self.device.bind(endpoints.pub, endpoints.sub);

      callback();
    })
  })
}