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
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Message;

function Message(data){
  EventEmitter.call(this);
  data || (data = {});
  this.headers = data.headers || {};
  this.body = data.body || null;
  this.headerSent = false;
}

util.inherits(Message, EventEmitter);

Message.prototype.toJSON = function(){
  return {
    headers:this.headers,
    body:this.body
  }
}

/*

  copied mostly from node.js/lib/http.js
  
*/
Message.prototype.setHeader = function(name, value) {
  if (arguments.length < 2) {
    throw new Error('`name` and `value` are required for setHeader().');
  }

  if (this.headerSent) {
    throw new Error('Can\'t set headers after they are sent.');
  }

  var key = name.toLowerCase();
  this.headers = this.headers || {};
  this.headers[key] = value;
}


Message.prototype.getHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for getHeader().');
  }

  if (!this.headers) return;

  var key = name.toLowerCase();
  var value = this.headers[key];

  if(!value){
    return value;
  }

  if(name.indexOf('x-json')==0 && _.isString(value)){
    value = this.headers[key] = JSON.parse(value);
  }
  
  return value;
}


Message.prototype.removeHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for removeHeader().');
  }

  if (this.headerSent) {
    throw new Error('Can\'t remove headers after they are sent.');
  }

  if (!this.headers) return;

  var key = name.toLowerCase();
  delete this.headers[key];
}