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

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var zmq = require('zmq');

module.exports = factory;

/*

  if there is no work then node.js dumps out

  prevent this with a nothing repeat
  
*/
setInterval(function(){
  
}, 60000)

var closing = false;

/*
  Quarry.io - Transport
  ---------------------

  produces different flavours of network connection

  the message content remains a string (the supply chain will turn it
  into a req, res etc)

  the service registry is consulted for addresses

 */

function factory(type){

  var socket = zmq.socket(type);

  /*
  
    make sure the socket goes when we close the process
    
  */
  process.on('SIGINT', function() {

    socket.close();

    if(!closing){
      closing = true;
      setTimeout(function(){
        process.exit();
      }, 100)
    }

  })

  return socket;
}
