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

var _ = require('lodash');
var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var Message = require('./message');

module.exports = Radio;

/*

  quarry.io - radio

  a radio is a way of sending messages amoungst containers
  that are not HTTP methods on the supplier but transient
  events - perfect for real-time comms

  a server-side container supplier can listen to their own
  radios and decide to save the data if they want

  in fact - how server-side containers (i.e. suppliers) deal
  with radio messages is up to the events hash of the container

  (^^^ this is how the bots work)

  
*/

function Radio(portal){
  EventEmitter.call(this);

  /*
  
    a register a portal routes against callbacks
    
  */
  this.portal = portal;
}

util.inherits(Radio, EventEmitter);

Radio.prototype._router = function(routingkey){
  var parts = [this.portal.router.shallow()];

  if(routingkey){
    parts.push(routingkey);
  }

  return parts.join('.');
}

Radio.prototype.close = function(){
  this.portal.close();
  return this;
}

/*

  listen in on container events
  
*/
Radio.prototype.listen = function(routingkey, fn){

  var self = this;
  if(!fn){
    fn = routingkey;
    routingkey = '';
  }

  if(_.isFunction(fn)){
    if(routingkey!=''){
      var origfn = fn;
      fn = function(message){
        origfn(message.data);
      }
    }
    else{
      var origfn = fn;
      fn = function(message){
        origfn(message.data, message.route);
      } 
    }
    this.portal._prependlisten('radio:/', this._router(routingkey), fn);
  }
  else if(_.isObject(fn)){
    _.each(fn, function(f, routingkey){
      self.listen(routingkey, f);
    })
  }

  return this;  
}

/*

  speak something
  
*/
Radio.prototype.talk = function(routingkey, data){

  if(!data){
    data = routingkey;
    routingkey = '';
  }

  this.portal._prependbroadcast('radio:/', this._router(routingkey), {
    route:routingkey,
    data:data
  })

  return this;
}