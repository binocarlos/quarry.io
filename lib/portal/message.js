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
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

module.exports = Message;

/*

  quarry.io - portal message

  the messages that arrive via a portal - hooked up with
  the targets and meta

  you pass the raw content of the message and a spawn
  function that will produce containers from data

  
*/

function Message(content, spawn){
  EventEmitter.call(this);

  _.extend(this, content || {});
  this.content = content;
  this.spawn = spawn;
}

util.inherits(Message, EventEmitter);

Message.prototype.get_containers = function(){
  var data = this.headers['content-type']=='quarry/containers' ? this.content.body : [];

  return this.spawn(data);
}

Message.prototype.get_target = function(){
  var data = this.target ? [{
    meta:this.target
  }] : [];

  return this.spawn(data);
}

Message.prototype.get_update = function(){
  var data = this.headers['content-type']=='quarry/update' ? data : [];

  return this.spawn(data);
}

Message.prototype.toJSON = function(){
  return this.content;
}