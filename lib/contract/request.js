/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */

var util = require('util');
var Message = require('./message');
var url = require('url');

var utils = require('../utils');

/*

  quarry.io - network request

  basic version of http.serverRequest
  
*/

module.exports = Request;


function Request(data){
  data || (data = {});
  Message.apply(this, [data]);
  this.path = data.path || '/';
  this.method = data.method || 'get';
  this.query = data.query || {};
  this.debugcallbacks = [];
  if(this.path.indexOf('?')>=0){
    _.extend(this.query, url.parse(this.path, true).query);
    this.path = this.path.split('?')[0];
  }
}

util.inherits(Request, Message);

Request.prototype.toJSON = function(){
  var ret = Message.prototype.toJSON.apply(this);

  ret.path = this.path;
  ret.method = this.method;
  ret.query = this.query;

  return ret;
}

Request.prototype.isContract = function(){
  return this.getHeader('content-type')=='quarry/contract';
}

Request.prototype.summary = function(){
  return this.method.toUpperCase() + ' ' + this.path + ' ' + (this.getHeader('content-type') ? this.getHeader('content-type') : '');
}

Request.prototype.skeleton = function(){
  return {
    path:this.path,
    method:this.method,
    query:this.query
  }
}

Request.prototype.debug = function(fn){

  if(arguments.length>0){
    this.setHeader('x-quarry-debug', true);
    this.debugcallbacks.push(fn);
    return this;
  }
  else{
    return this.getHeader('x-quarry-debug')==true;  
  }
}

Request.prototype.routingpacket = function(){
  return {
    path:this.path,
    method:this.method,
    contenttype:this.getHeader('content-type'),
    department:this.getHeader('x-quarry-department'),
    stackid:this.getHeader('x-quarry-stackid')
  }
}
/*

  update a spawned request (usually from a contract child)
  with the top-level data that has been sent with the top-level contract
  
*/
Request.prototype.inject = function(req){
  req.setHeader('x-json-quarry-user', this.getHeader('x-json-quarry-user'));
  req.setHeader('x-quarry-bayid', this.getHeader('x-quarry-bayid'));

  if(!req.getHeader('x-quarry-department')){
    req.setHeader('x-quarry-department', this.getHeader('x-quarry-department'));  
  }

  if(!req.getHeader('x-json-quarry-projectroutes')){
    req.setHeader('x-json-quarry-projectroutes', this.getHeader('x-json-quarry-projectroutes'));  
  }

  return this;
}

Request.prototype.summary = function(){
  return this.method + ' ' + this.path + ' ' + this.getHeader('content-type');
}