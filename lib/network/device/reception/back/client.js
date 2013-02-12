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
var Proto = require('../proto');
var log = require('logule').init(module, 'Node');

var ReceptionMonitor = require('../monitor');
var ReceptionCollection = require('../collection');


/*

  quarry.io - rack client

  listens to the system switchboard for the addition/removal
  of reception.sparks

  this provides us with a realtime list of reception server endpoints

  we can bind to either front or back and the switchboard in both versions
  of the client
  
*/

module.exports = ReceptionBackClient;

/*

  skeleton network config
  
*/

function ReceptionBackClient(options){
  Proto.apply(this, [options]);

  this.monitor = new ReceptionMonitor(this.db);
  this.collection = new ReceptionCollection();

  this.monitor.on('add', function(spark){
    self.collection.add(spark);
  })

  this.monitor.on('remove', function(spark){
    self.collection.remove(spark);
  })
}

util.inherits(ReceptionBackClient, Proto);

ReceptionBackClient.prototype.boot = function(callback){
  var self = this;

  async.series([
    function(next){
      self.monitor.boot(next);
    }
  ], callback)

  

}