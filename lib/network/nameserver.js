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

var log = require('logule').init(module, 'Nameserver');
var dye = require('dye');
var Redis = require('../vendor/redis');

var baseconfig = require('../../config.json').servers.redis;

/*

  quarry.io - service registry

  Redis driven map of network services and their network config
  
*/

module.exports = NameServer;

function NameServer(config){
  EventEmitter.call(this);
  this.initialize(config);
}

util.inherits(NameServer, EventEmitter);

/*

  connect the Redis client
  
*/
NameServer.prototype.initialize = function(config){
  var self = this;

  config = _.extend(baseconfig, config);
  
  this.redis = Redis(config);
  this.cache = this.redis.createCache('quarry.nameserver');

  return this;
}

NameServer.prototype.reset = function(callback){
  var self = this;

  self.cache.keys(function(error, keys){

    if(error || keys.length<=0){
      callback();
    }
    else{
      self.cache.flush(function(error){
        if(!error){
          log.info('nameserver reset');
        }
        callback(error);
      })
    }
  })

}

/*

  save a device config into the cache
  
*/
NameServer.prototype.setdevice = function(key, config, callback){
  var val = JSON.stringify(config);
  log.info('set device: ' + dye.red(key));
  this.cache.set(key, val, callback);
}

/*

  save a device config into the cache
  
*/
NameServer.prototype.getdevice = function(key, callback){
  this.cache.get(key, function(error, val){
    val = error ? val : JSON.parse(val);
    callback(error, val);
  })
}