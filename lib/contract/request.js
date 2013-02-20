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

var util = require('util');
var Message = require('./message');
var url = require('url');

var utils = require('../utils');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Request;


function Request(data){
  data || (data = {});
  Message.apply(this, [data]);
  this.path = data.path || '/';
  this.method = data.method || 'get';
  this.query = data.query || {};
  if(this.path.indexOf('?')>=0){
    _.extend(this.query, url.parse(this.path, true).query);
    this.path = this.path.split('?')[0];
  }
}

util.inherits(Request, Message);

Request.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.path = this.path;
  ret.method = this.method;
  ret.query = this.query;

  return ret;
}

Request.prototype.isContract = function(){
  return this.getHeaer('content-type')=='quarry/contract';
}

Request.prototype.summary = function(){
  return this.method.toUpperCase() + ' ' + this.path + ' ' + (this.getHeader('content-type') ? this.getHeader('content-type') : '');
}

Request.prototype.skeleton = function(){
  return {
    path:this.path,
    method:this.method,
    query:this.query
  }
}

Request.prototype.debug = function(activate){

  if(arguments.length>0){
    this.setHeader('x-quarry-debug', arguments[0]);
    return this;
  }
  else{
    return this.getHeader('x-quarry-debug')==true;  
  }
}

/*

  update a spawned request (usually from a contract child)
  with the top-level data that has been sent with the top-level contract
  
*/
Request.prototype.inject = function(req){
  req.setHeader('x-quarry-debug', this.getHeader('x-quarry-debug'));
  req.setHeader('x-json-quarry-user', this.getHeader('x-json-quarry-user'));
  req.setHeader('x-json-quarry-transaction', this.getHeader('x-json-quarry-transaction'));
}

Request.prototype.getcontractheader = function(){
  return {
    contractid:this.getHeader('x-contract-id'),
    contenttype:this.getHeader('content-type'),
    method:this.method,
    path:this.path
  }
}