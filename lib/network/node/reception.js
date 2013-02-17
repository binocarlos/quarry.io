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
var log = require('logule').init(module, 'Node');

var Device = require('../device');

/*

  quarry.io - reception node

  the network middleware
  
*/

module.exports = Reception;

/*

  skeleton network config
  
*/

function Reception(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(Reception, Node);

Reception.prototype.boot = function(callback){

  this.switchboard = null;

  var self = this;
  var node = this.node;
  var spark = this.spark;
  var endpoints = spark.attr('endpoints');
  
  async.series([

    /*
    
      make a clustered switchboard cliebt
      
    */
    function(next){

      Device('switchboard.multiclient', {
        db:self.db
      }, function(error, client){
        self.switchboard = client;
        next();
      })

    },

    function(next){
      var server = Device('reception.server', {
        stackid:node.attr('stackid'),
        socketid:spark.quarryid(),
        switchboard:self.switchboard
      })

      server.bind(endpoints.front, endpoints.back);
    }

  ], function(){

    callback();
  })
  
  
  
  
}