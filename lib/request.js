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
var Backbone = require('./vendor/backbone');
var eyes = require('eyes');
var url = require('url');

/*
  Quarry.io - Request
  -------------------

  Generic request object - they map onto HTTP requests nicely but can be sent down ZeroMQ

  

 */

var req = exports = module.exports = {
  __proto__: Backbone.Events.prototype
}

/*

  Create a new request object from the raw data
  This is the deserlization step

  /xml/123:456?selector=city.green



  HTTP REST -> QUARRY methods:           

    GET       SELECT
    POST      APPEND
    PUT       SAVE
    DELETE    DELETE

  method: GET|POST|PUT|DELETE

  route:              string or parsed object
    protocol
    hostname
    path
  
  params            object either from body or querystring
  headers           object from HTTP
  body              raw content of update



  // run a selector and get the content-length as a count of containers in the results
  // used for paging
  {
    method:'head',
    route:{
      protocol:'quarry',
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },
    params:{
      selector:'product.cheap'
    },
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

  // run a selector against two containers (123 & 456) inside of /db/quarry/bob/db1
  {
    method:'get',
    route:{
      protocol:'quarry',
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },
    params:{
      selector:'product.cheap'
    },
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

  // append some containers to an existing container inside a database
  {
    method:'post',
    route:{
      protocol:'quarry',
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:{
      // raw containers
    }
  }

  // save one containers data
  {
    method:'put',
    route:{
      protocol:'quarry',
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:{
      // raw container data
    }
  }

  // delete two containers
  {
    method:'delete',
    route:{
      protocol:'quarry',
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

 */
req.factory = function(raw){
  var request = _.extend({}, raw);
  request.init();
  return request;
}

req.init = function(){
  this.route || (this.route = {});
  this.headers || (this.headers = {});
  this.params || (this.params = {});
  if(_.isString(this.route)){
    var parsedURL = url.parse(this.route, true, true);
    this.route = {
      protocol:parsedURL.protocol,
      hostname:parsedURL.hostname,
      port:parsedURL.port,
      path:parsedURL.pathname
    }
    this.params = _.extend(this.params, parsedURL.query);
  }
  if(_.isEmpty(this.id)){
    this.id = utils.quarryid();
  }
}

req.header = function(name, val){
  this.headers || (this.headers = {});
  return arguments.length>=2 ? this.headers[name] = val : this.headers[name];
}

req.param = function(name, val){
  this.params || (this.params = {});
  return arguments.length>=2 ? this.params[name] = val : this.params[name];
}

// return an object with no functions for serializing
req.toJSON = function(){
  var ret = {};
  _.each(this, function(val, key){
    if(!_.isFunction(val)){
      ret[key] = val;
    })
  })
  return ret;
}