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
var dye = require('dye');
var log = require('logule').init(module, 'Socket Collection');

/*

  quarry.io - Reception Collection

  represents the endpoints for each reception server we have

  we build out different sockets depending on where we are using this (front or back or middle)
  
*/

module.exports = SocketCollection;

/*

  skeleton network config
  
*/

function SocketCollection(){

  EventEmitter.call(this);

  mode || (mode = 'server');

  /*
  
    a map of reception sparks by their quarry id

    each one is a spark container plugged into the system db
    
  */
  this.sparks = {};

  this.socket = {
    send:function(){

    }
  }

  _.extend(this.socket, EventEmitter.prototype);
}

util.inherits(ReceptionCollection, EventEmitter);

ReceptionCollection.prototype.add = function(spark, callback){
  var endpoints = spark.attr('endpoints');

  this.sparks[spark.quarryid()] = spark;
  

}

ReceptionCollection.prototype.remove = function(spark, callback){

  
}