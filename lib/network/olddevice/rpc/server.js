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

module.exports = RPCServer;

/*
  Quarry.io - RPC Server
  ----------------------

  string server that sends request ids back for the client to trigger a callback

  

 */

function RPCServer(options){
  EventEmitter.call(this);
  
  this.options = options || {};

  if(!options.socket){
    throw new Error('RPCServer requires a socket');
  }

  this.socket = options.socket;

  this.socket.on('message', _.bind(this.handle, this));
}

util.inherits(RPCServer, EventEmitter);

RPCServer.prototype.bind = function(endpoint){
  this.socket.bindSync(endpoint);
}

RPCServer.prototype.connect = function(endpoint){
  this.socket.connect(endpoint);
}

/*

  register the callback function for JSON requests
  
*/
RPCServer.prototype.handle = function(){
  var self = this;
  var args = _.map(_.toArray(arguments), function(arg){
    return arg.toString();
  })

  var data = args.pop();

  data = this.options.json ? JSON.parse(data) : data;  

  var replyargs = [].concat(args);

  function response(data){

    /*
    
      grab the response
      
    */
    data = self.options.json ? JSON.stringify(data) : data;
    replyargs.push(data);

    /*
    
      get it sent back to the client
      
    */
    self.socket.send(replyargs);
  }
  /*
  
    append the callback function after the arguments
    
  */
  
  self.emit.apply(self, ['message', data, response]);

}