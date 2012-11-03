/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

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

/*
  Module dependencies.
*/

var _ = require('underscore');
var async = require('async');
var utils = require('./utils');
var eyes = require('eyes');

/*
  Quarry.io - Message
  -------------------

  A message is a pub/sub packet

  It just has a body and routing data

 


 */

module.exports = factory;

/*

  The packet factory is what turns raw JSON packets into their object representation

  A packet is ALWAYS an array

  It has two types:

  merge, pipe (default is merge)

  this means that an array with one element is default merge and will just answer

  If the JSON has a merge or pipe array then the packet is a wrapper for a reduction

 */

function factory(data){
  
  return new Message(data);
}

function accessor(host, field){
  return function(){
    return arguments.length>0 ? host[field] = arguments[0] : host[field];
  }
}

function Message(data){

  var self = this;

  this.data = data || {};

  this.data = _.defaults(this.data, {
    type:'container',
    action:'append',
    body:null,
    route:{
      protocol:null,
      hostname:null,
      resource:null
    },
    quarryid:null,
    id:utils.quarryid(),
    packet_id:null
  })

  this.type = accessor(this.data, 'type');
  this.action = accessor(this.data, 'action');

  this.route = accessor(this.data, 'route');
  this.protocol = accessor(this.data.route, 'protocol');
  this.hostname = accessor(this.data.route, 'hostname');
  this.resource = accessor(this.data.route, 'resource');
  this.quarryid = accessor(this.data, 'quarryid');

  this.body = accessor(this.data, 'body');
  this.id = accessor(this.data, 'id');
  this.packet_id = accessor(this.data, 'packet_id');
  
}

Message.prototype.toJSON = function(){
  return this.data;
}