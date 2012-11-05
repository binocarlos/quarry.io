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
  Quarry.io - Response
  --------------------

  Generic response object - they map onto HTTP responses nicely but can be sent down ZeroMQ

  

 */

var res = exports = module.exports = {
  __proto__: Backbone.Events.prototype
}

/*

  Response object is simpler:

  headers
  body

 */
res.factory = function(raw){
  var response = _.extend({}, raw);

  response.init();
  
  return response;
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