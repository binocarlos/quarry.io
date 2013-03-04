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
var Warehouse = require('../../../warehouse');
var Contract = require('../../../contract');
var Device = require('../../device');
var httpProxy = require('http-proxy');
var http = require('http');
var HoldingBay = require('./holdingbay');
var Router = require('./router');

module.exports = ReceptionServer;

/*
  Quarry.io - SupplyChain Server
  ------------------------------

  A JSON server that hooks into a warehouse
  and connects a switchboard client

  

 */

function ReceptionServer(options){
  var self = this;
  EventEmitter.call(this);

  this.switchboard = options.switchboard;

  if(!this.switchboard){
    throw new Error('Reception Server requires a switchboard');
  }

  /*
  
    a map of the callback functions for responses
    from the back socket to map into the holdingbay
    
  */
  this.callbacks = {};

  this.front = Device.socket('router');
  this.front.identity = options.socketid + ':front';
  

  this.back = Device.socket('router');
  this.back.identity = options.socketid + ':back';

  this.router = Router();

  this.holdingbay = HoldingBay({
    switchboard:this.switchboard
  })

  /*
  
    send the answer back down the front socket
    
  */
  this.front.on('message', _.bind(this.handlefront, this));

  this.holdingbay.on('dispatch:front', function(frames){

    self.front.send(frames);
    
  })

  /*
  
    send a request back down the api socket
    
  */
  this.back.on('message', _.bind(this.handleback, this));

  this.holdingbay.on('dispatch:back', function(department, stackpath, frames){

    var socketid = self.router.rpc(department, stackpath);

    if(!socketid){
      throw new Error('no socket found: ' + department + ':' + stackpath);
    }
    
    /*
    
      use the router to get these frames to the correct socket
      
    */
    frames.unshift(socketid);

    self.back.send(frames);
  })

  this.httpproxy = new httpProxy.RoutingProxy();
  this.httprouter = http.createServer(_.bind(this.handlehttp, this));

    
}

util.inherits(ReceptionServer, EventEmitter);

ReceptionServer.prototype.bind = function(endpoints){

  this.front.bindSync(endpoints.front);
  this.back.bindSync(endpoints.back);
  this.httprouter.listen(endpoints.http.port);
  
  return this;
}

ReceptionServer.prototype.handlefront = function(){
  this.holdingbay.handlefront(_.toArray(arguments));  
}

ReceptionServer.prototype.handleback = function(){
  var self = this;
  
  if(arguments[1].toString()=='heartbeat'){
    this.router.heartbeat(arguments[0].toString(), JSON.parse(arguments[2].toString()));    
  }
  else{
    this.holdingbay.handleback(_.toArray(arguments));  
  }
}

ReceptionServer.prototype.handlehttp = function(req, res){
  var self = this;
  var department = req.headers['x-quarry-department'];

  var endpoints = self.router.endpoints(department, req.url);

  if(!endpoints){
    res.statusCode = 404;
    res.send('not found');
    return;
  }

  var endpoint = endpoints.http;
  endpoint.host = endpoint.hostname;

  this.httpproxy.proxyRequest(req, res, endpoint);
}