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

module.exports.local = local_factory;
module.exports.quarry = quarry_factory;
module.exports.http = http_factory;

/*
  Quarry.io - Supply Chain
  ------------------------

  Looks after the transport of messages between warehouses

  A supply chain itself is a function fn(packet, callback)

  A local supply chain just uses the function to connect to another and pipes the packet

  A remote supply chain has a protocol quarry & http to start

  This decides how the supply chain will build a connection to the destination

  The supply chain should be given auth info it might need

  In the case of quarry protocol - it means connecting via a ZeroMQ socket

  In the case of HTTP - it is the http.request

  API suppliers are basically quarry supply chains being routed to a HTTP supply chain on the other end


 */


function local_factory(){

}