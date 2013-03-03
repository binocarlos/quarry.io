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
var Warehouse = require('../../../warehouse');

var Request = require('../../../contract/request');
var SwitchboardClient = require('../switchboard/client');
var Contract = require('../../../contract');
var Container = require('../../../container');
var RedisClient = require('../../../vendor/redis');

module.exports = SupplyChainClient;

/*
  Quarry.io - SupplyChain Server
  ------------------------------

  A JSON server that hooks into a warehouse
  and connects a switchboard client

  

 */

function SupplyChainClient(options){
  EventEmitter.call(this);
  var self = this;
  this.options = options || {};
}

util.inherits(SupplyChainClient, EventEmitter);

/*

  the same as req, res, next but the raw request
  and pure function callback
  
*/
SupplyChainClient.prototype.rpc = function(rawreq, callback){
  var rpc = this.options.rpc;
  
  var sendargs = [rawreq, callback];

  rpc.send.apply(rpc, sendargs);
}

/*

   in bind mode we are a single socket
  
*/
SupplyChainClient.prototype.connect = function(mountpath){

  var self = this;

  var switchboard = this.options.switchboard;
  var rpc = this.options.rpc;
  var stackid = this.options.stackid;

  if(!switchboard){
    throw new Error('supply chain client needs a switchboard');
  }

  if(!rpc){
    throw new Error('supply chain client needs a rpc');
  }

  var container = Container.new({
    meta:{
      quarrysupplier:mountpath ? mountpath : '',
      supplychainroot:true
    }
  })
  
  function supplychain(req, res, next){

    var sendargs = [req.toJSON(), function(answerpacket){
      res.fill(answerpacket);
    }]

    rpc.send.apply(rpc, sendargs);
  }



  /*
  
    merge the switchboard into the supplychain and provide it
    to the container
    
  */
  supplychain.switchboard = switchboard;
  container.supplychain = supplychain;

  /*
  
    a recursive connection so we can dig down the tree in the form of clients
    
  */
  container.connect = function(submountpath){
    var fullpath = [mountpath, submountpath].join('/').replace(/\/\//g, '/');

    return self.connect(fullpath);
  }

  return container;
}