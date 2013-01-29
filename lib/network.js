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

var Request = require('./network/request');
var Response = require('./network/response');

/*
  Quarry.io - Network
  -------------------

  


 */

module.exports = factory;
module.exports.server_options = { 
  "servers":{
    "redis":{
      "hostname":"127.0.0.1",
      "port":6379
    },
    "mongo":{
      "hostname":"127.0.0.1",
      "port":27017
    }
  }
}

function factory(){

}

factory.request = function(data){
  return new Request(data);
}

factory.response = function(data){

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