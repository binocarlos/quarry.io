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
  if(_.isString(data)){
    var match = data.match(/^(\w+):\/\/(.*?)\/(.*?)$/);

    data = {
      protocol:match[1],
      host:match[2],
      path:match[3]
    }
  }

  return new Packet(data);
}

function reqres(data){
  var api = function(){}

  api.header = function(){
    if(arguments.length==0){
      return data.headers || {};
    }
    else if(arguments.length==1){
      return data.headers && data.headers[arguments[0]];
    }
    else if(arguments.length==2){
      data.params || (data.headers = {});
      data.headers[arguments[0]] = arguments[1];
      return this;
    }
  }

  api.param = function(){
    if(arguments.length==0){
      return data.params || {};
    }
    else if(arguments.length==1){
      return data.params && data.params[arguments[0]];
    }
    else if(arguments.length==2){
      data.params || (data.params = {});
      data.params[arguments[0]] = arguments[1];
      return this;
    }
  }

  api.body = function(){
    if(arguments.length==0){
      return data.body;
    }
    else if(arguments.length==1){
      return data.body=arguments[0];
    }
  }

  api.toJSON = function(){
    return data;
  }

  return api;
}

function accessor(host, field){
  return function(){
    return arguments.length>0 ? host[field] = arguments[0] : host[field];
  }
}

function Packet(data){

  var self = this;

  this.data = data || {};

  this.data = _.defaults(this.data, {
    
  })

  this.data.id || (this.data.id = utils.quarryid());

  this.data.req || (this.data.req = {})
  this.data.res || (this.data.res = {})

  this.req = reqres(this.data.req);
  this.res = reqres(this.data.res);

  this.protocol = accessor(this.data, 'protocol');
  this.req.protocol = accessor(this.data, 'protocol');

  this.hostname = accessor(this.data, 'hostname');
  this.req.hostname = accessor(this.data, 'hostname');

  this.path = accessor(this.data, 'path');
  this.req.path = accessor(this.data, 'path');
}

Packet.prototype.hasPath = function(){
  return this.data.path && this.data.path.length>0;
}

Packet.prototype.toJSON = function(){
  return this.data;
}
Packet.prototype.hasError = function(){
  return !_.isEmpty(this.error());
}

Packet.prototype.error = function(st){
  this.data.error = st;
}
Packet.prototype.iscontract = function(type){

  if(type){
    return this.path()=='/contract/' + type;
  }
  else{
    return this.path() && this.path().match(/^\/contract/);
  }
}

Packet.prototype.add_contract_packet = function(packet){
  this.req.body() || (this.req.body([]));
  this.req.body().push(packet.toJSON());
}

Packet.prototype.hasRequestBody = function(){
  return !_.isEmpty(this.req.body());
}

Packet.prototype.convert_to_contract = function(type){
  var packet_array = this.hasRequestBody() ? [this.toJSON()] : [];
  this.path('/contract/' + type);
  this.protocol('quarry');
  this.req.body(packet_array);
  return this;
}

Packet.prototype.clone = function(){
  return factory(JSON.parse(JSON.stringify(this.toJSON())));
}

/*
  A pipe is pass the results of the last onto the next

 */
Packet.prototype.pipe = function(packet){

  if(!this.iscontract('pipe')){
    this.convert_to_contract('pipe');
  }

  this.add_contract_packet(packet);

  return this;
}

/*
  A merge is run in parallel and merge the results

 */
Packet.prototype.merge = function(packet){

  if(!this.iscontract('merge')){
    this.convert_to_contract('merge');
  }

  this.add_contract_packet(packet);

  return this;
}

/*
  Turn the contract into a branch
  This is a pipe but the warehouse branching router
  kicks in for each stage

  A branch is basically a pipe that can duplicate sideways each step and merge at the end

 */
Packet.prototype.branch = function(packet){
  if(!this.iscontract('branch')){
    this.convert_to_contract('branch');
  }

  this.add_contract_packet(packet);
  return this;
}

/*
  Send the packet off down another supply chain

 */
Packet.prototype.proxy = function(supply_chain, callback){

  if(!supply_chain){
    callback(this);
    return;
  }

  // pipe the packet down the supply chain
  supply_chain(this.clone(), callback);
}
