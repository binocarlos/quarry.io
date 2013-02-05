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

var log = require('logule').init(module, 'Portal');
var dye = require('dye');
var eyes = require('eyes');
var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var inspectselect = require('inspectselect');
var Router = require('./router');

module.exports = Portal;

/*

  quarry.io - portal

  a wrapper representing events broadcast and subsrcibed for
  a container within a stack

  it manages the subscription keys via the routes property of the
  container's meta data

  supplier.portal.method

  
*/

function Portal(){
  EventEmitter.call(this);
}

util.inherits(Portal, EventEmitter);

/*

  attach this portal onto a switchboard client
  
*/
Portal.prototype.attach = function(skeleton, switchboard){
  if(switchboard){
    this.on('listen', _.bind(switchboard.listen, switchboard));
    this.on('broadcast', _.bind(switchboard.broadcast, switchboard));
  }

  this.routes = Router(skeleton);
}

//Portal.prototype.

//Portal.prototype.


/*
Portal.prototype.listen = function(routingkey, fn){
  if(!this.switchboard){
    return this;
  }

  if(!fn){
    fn = routingkey;
    routingkey = '*';
  }

  routingkey = this.container.portalkey(routingkey);

  this.switchboard.listen(routingkey, function(packet){
    fn(packet);
  })

  return this;
}

Portal.prototype.broadcast = function(routingkey, message){
  if(!this.switchboard){
    return this;
  }

  if(!message){
    message = routingkey;
    routingkey = '*';
  }

  routingkey = this.container.portalkey(routingkey, true);
  
  this.switchboard.broadcast(routingkey, message);

  return this;
}
*/