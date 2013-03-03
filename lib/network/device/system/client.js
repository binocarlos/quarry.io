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

var Device = require('../../device');

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

module.exports = SystemClient;

function SystemClient(options){
  EventEmitter.call(this);
  this.options = options || {};
  this.stackid = this.options.stackid;
  this.systemconfig = this.options.systemconfig;
  this.endpoints = this.systemconfig.attr('systemendpoints');

  var rpcclient = Device('rpc.client', {
    json:true,
    socket:Device.socket('dealer')
  })

  var switchboard = Device('switchboard.client', {
    pub:Device.socket('pub'),
    sub:Device.socket('sub')
  })

  var supplychain = Device('supplychain.client', {
    switchboard:switchboard,
    rpc:rpcclient,
    stackid:'system'
  })

  //supplychain.on('request', _.bind(rpcclient.send, rpcclient));

  rpcclient.connect(this.endpoints.rpc);
  switchboard.connect(this.endpoints.pub, this.endpoints.sub);

  this.supplychain = supplychain;
  return supplychain;
}

util.inherits(SystemClient, EventEmitter);

SystemClient.prototype.connect = function(path){
  return this.supplychain.connect(path);
}
