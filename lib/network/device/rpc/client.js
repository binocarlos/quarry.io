/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');


module.exports = RPCClient;

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

function RPCClient(options){
  EventEmitter.call(this);
  this.options = options || {};

  if(!options.socket){
    throw new Error('RPCClient requires a socket');
  }

  /*
  
    keep a register of the callback functions by id
    
  */
  this.callbacks = {};
  this.socket = options.socket;

  this.socket.on('message', _.bind(this.handle, this));
}

util.inherits(RPCClient, EventEmitter);

RPCClient.prototype.bind = function(endpoint){
  this.socket.bindSync(endpoint);
}

RPCClient.prototype.connect = function(endpoint){
  this.socket.connect(endpoint);
}

RPCClient.prototype.send = function(){
  var args = _.toArray(arguments);
  
  var callback = args.pop();

  //args[args.length-1] = JSON.stringify(args[args.length-1]);

  var requestid = utils.quarryid();
  this.callbacks[requestid] = callback;

  /*
  
    inject the request id and stringified data
    
  */
  var data = args.pop();
  data = this.options.json ? JSON.stringify(data) : data;
  args.unshift(requestid);
  args.push(data);

  this.socket.send(args);
}

/*

  register the callback function for JSON requests
  
*/
RPCClient.prototype.handle = function(){
  var self = this;

  var args = _.map(_.toArray(arguments), function(arg){
    return arg.toString();
  })

  var data = args.pop();
  var requestid = args.shift();

  data = this.options.json ? JSON.parse(data) : data;

  args.push(data);

  var callback = this.callbacks[requestid];
  if(callback){
    delete(this.callbacks[requestid]);
    callback.apply(null, args);
  }

}