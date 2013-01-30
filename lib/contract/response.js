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

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Response;

function Response(data){
  Message.apply(this, [data]);
}

util.inherits(Response, Message);

Response.prototype.statusCode = 200;

Response.prototype.send = function(body){
  this.body = body;
  this.emit('beforesend');
  this.emit('send');
  this.headerSent = true;
  return this;
}

Response.prototype.json = function(body){
  this.setHeader('Content-Type', 'application/json');
  return this.send(body);
}

Response.prototype.send404 = function(){
  this.statusCode = 404;
  return this.send(this.url + '/not found');
}

Response.prototype.error = function(body){
  this.statusCode = 500;
  return this.send(body);
}


Response.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.statusCode = this.statusCode;

  return ret;
}