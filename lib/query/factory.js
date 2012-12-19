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
var Request = require('./request');
var Response = require('./response');
var eyes = require('eyes');
var url = require('url');

/*
  Quarry.io - Query Factory
  -------------------------

  Knows how to formulate & process requests for different purposes

  

 */

var api = module.exports = {};

api.fromJSON = function(json){
  return new Request(json);
}

api.resfromJSON = function(json){
  return new Response(json);
}

// a non container query
api.request = function(options){
  options || (options = {});
  options = _.defaults(options, {
    method:'get',
    path:'/',
    body:{}
  })

  var req = new Request(options);

  return req;
}

api.response = function(callback){
  var res = new Response();

  res.on('send', function(){
    callback && callback(res);
  })

  return res;
}

api.contract = function(type){
  var req = new Request({
    method:'post',
    path:'/reception/' + type
  })

  return req;
}



// routes is an array of route info for the context
// selectors is an array of selector strings to be reversed into a pipe
api.selector = function(routes, selector){

  var req = new Request({
    method:'post',
    path:'/reception/branch',
    body:{
      routes:routes,
      request:{
        method:'get',
        params:{
          selector:selector
        }
      }
    }
  })

  return req;
}

api.append = function(routes, data){
  
  var req = new Request({
    method:'post',
    path:'/reception/branch',
    body:{
      routes:routes,
      request:{
        method:'post',
        body:data
      }
    }
  })

  return req;
}

api.select = function(options){
  options || (options = {});
  var req = new Request({
    method:'get',
    path:options.path,
    params:{
      'select':options.select,
      'skeleton':options.skeleton,
      'includestamp':options.includestamp
    }
  })

  return req;
}



