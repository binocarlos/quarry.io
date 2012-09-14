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

var _ = require('underscore'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

/*
  The RPC server

  A ROUTER socket in the shape of a REP

 */

function server_factory(options){

  options = options || {};

  // the in-coming socket
  var requests = zmq.socket('router');

 

  var requests.identity = 'majordomo:incoming:' + process.pid;
  var responders = zmq.socket('dealer');
  var responders.identity = 'majordomo:outgoing:' + process.pid;
  
}

function client_factory(options){

  options = options || {};

  // the in-coming socket
  var requests = zmq.socket('router');

 

  var requests.identity = 'majordomo:incoming:' + process.pid;
  var responders = zmq.socket('dealer');
  var responders.identity = 'majordomo:outgoing:' + process.pid;
  
}

exports = module.exports = {
  client:client_factory,
  server:server_factory
}
