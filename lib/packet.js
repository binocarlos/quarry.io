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
  Quarry.io - Packet
  ------------------

  The wrapper for any message through the quarry.io system

  A packet has three message types

  req - the request in a req/rep

  res - the response in a req/rep

  broadcast - a broadcast packet

  {
    id:...//quarryid,
    stamps:[
      // an array of:
      {
        warehouse:'start',
        time:243243434
      },
      {
        warehouse:'router.dfsdf',
        time:243243434
      }
    ],
    req:{
      headers:{
        ...
      },
      body:...
    },
    res:{
      headers:{
        ...
      },
      body:...
    },
    broadcast:{
      headers:{
        ...
      },
      body:...
    }
  }


 */
 
function data_factory(){
  return {
    req:message_data_factory(),
    res:message_data_factory()
  }
}

function message_data_factory(){
  return {
    headers:{

    },
    body:null
  }
}

function message_factory(data){
  data || (data = message_data_factory());

  function message(){
    this.data = data;
  }

  message.raw = function(){
    return arguments.length>0 ? data = arguments[0] : data;
  }

  message.params = function(){
    return arguments.length>0 ? data.params = arguments[0] : data.params;
  }

  message.body = function(){
    return arguments.length>0 ? data.body = arguments[0] : data.body;
  }

  message.headers = function(){
    return arguments.length>0 ? data.headers = arguments[0] : data.headers; 
  }

  message.toJSON = function(){
    return data;
  }

  message.header = function(){

    if(arguments.length<=0){
      return data.headers;
    }
    else if(arguments.length==1){
      return data.headers[arguments[0]]
    }
    else{
      return data.headers[arguments[0]] = arguments[1];
    }
  }

  return message;
}

function packet_factory(data){

  data || (data = {});

  function packet(){

  }

  packet.req = message_factory(data.req);
  packet.res = data.res ? message_factory(data.res) : null;
  packet.input = null;

  packet.qrl = function(){
    return arguments.length>0 ? data.qrl = arguments[0] : data.qrl;
  }

  packet.method = function(){
    return arguments.length>0 ? data.method = arguments[0] : data.method;
  }

  packet.route = function(){
    return arguments.length>0 ? data.route = arguments[0] : data.route;
  }

  packet.input = function(){
    return arguments.length>0 ? data.input = arguments[0] : data.input;
  }

  packet.is = function(type){
    return this.method()==type;
  }

  // this adds the container routing into the packet
  packet.stamp = function(container){
    if(arguments.length>0){
      data.route = {
        protocol:container.protocol(),
        host:container.host(),
        path:container.quarryid()
      }
    }
  }

  // a special stamp for the in-memory find command
  // this packet won't end up in the warehouse
  // just in the in-memory reducer
  packet.ram_stamp = function(container){
    if(arguments.length>0){
      data.route = {
        protocol:'ram',
        host:'localhost',
        path:container.quarryid()
      }
    }
  }

  packet.toJSON = function(){
    var ret = _.extend({}, data);

    ret.route = data.route;
    ret.input = data.input;
    ret.req = this.req.toJSON();
    ret.res = this.res ? this.res.toJSON() : null;


    return ret;
  }

  return packet;
}

module.exports.factory = function(raw){
  return packet_factory(raw);
}

module.exports.raw = module.exports.factory;

var map_methods = [
  'select',
  'contract',
  'get',
  'head',
  'post',
  'delete',
  'append'
];

_.each(map_methods, function(map_method){
  module.exports[map_method] = function(params){
    var packet = packet_factory();
    
    packet.method(map_method);
    packet.req.params(params);

    return packet;
  }
})