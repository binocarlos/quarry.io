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
var _ = require('lodash');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Response;

function Response(data){
  Message.apply(this, [data]);
}

Response.factory = function(data){

  /*
  
    sort out the constructor so you can quickly
    create responses with the callback hooked up
    
  */
  var fn = null;

  if(_.isFunction(data)){
    fn = data;
    data = null;
  }

  var ret = new Response(data);

  if(fn){
    ret.on('send', function(){
      fn(null, ret);
    })
  }

  return ret;
}

util.inherits(Response, Message);

Response.prototype.statusCode = 200;

Response.prototype.fill = function(datastring){
  _.extend(this, JSON.parse(datastring));
  this.send();
}

Response.prototype.send = function(body){
  arguments.length>0 && (this.body = body);
  this.emit('beforesend');
  this.emit('send');
  this.headerSent = true;
  return this;
}

Response.prototype.json = function(body){
  this.setHeader('content-type', 'application/json');
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

Response.prototype.hasError = function(){
  return this.statusCode==500;
}

Response.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.statusCode = this.statusCode;

  return ret;
}

Response.prototype.isMultipart = function(){
  return this.getHeader('content-type')=='quarry/multipart';
}

/*

  turns the response into a multipart container for lots of responses

*/
Response.prototype.multipart = function(arr){
  this.setHeader('content-type', 'quarry/multipart');
  this.body = arr ? arr : [];
  this.send();
}

Response.prototype.add = function(res){
  this.setHeader('content-type', 'quarry/multipart');
  if(!this.body){
    this.body = [];
  }
  this.body.push(res.toJSON());
}

Response.prototype.summary = function(){
  return this.statusCode + ' ' + (this.hasError() ? this.body : this.getHeader('content-type'));
}