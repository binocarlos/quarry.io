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
var Contract = require('../../../contract');
var Client = require('./client');

module.exports = SupplyChainServer;
/*

   the main RPC handler
  
*/
function SupplyChainServer(options){
  EventEmitter.call(this);
  var self = this;
  this.options = options || {};

  this.rpc = this.options.rpc;
  this.switchboard = this.options.switchboard;
  this.stackid = this.options.stackid;
  this.warehouse = Warehouse();

  if(!this.switchboard){
    throw new Error('supply chain server needs a switchboard');
  }

  if(!this.rpc){
    throw new Error('supply chain server needs a rpc');
  }

  function handle(packet, callback){

    var req = Contract.request(packet);
    var res = Contract.response(function(){
      callback(res.toJSON());
    })

    self.warehouse(req, res, function(){
      res.send404();
    })
  }

  this.rpc.on('message', handle);
}

util.inherits(SupplyChainServer, EventEmitter);

SupplyChainServer.prototype.use = function(stackpath, handler){

  if(!handler){
    handler = stackpath;
    stackpath = "/";
  }
  
  var self = this;

  /*
            
     this is the initial spark for a request entering this supplychain
    
  */
  function bootstrap_request(bootstrapreq){
    /*
  
      when a request ends up server side we stamp it with the stackpath
      which a supplier can then use to stamp containers with the route

      this is used by handlers to know where on the stack we are being invoked from
      
    */
    if(!bootstrapreq.getHeader('x-quarry-supplier')){
      bootstrapreq.setHeader('x-quarry-supplier', stackpath);
    }

    if(!bootstrapreq.getHeader('x-quarry-stack')){
      bootstrapreq.setHeader('x-quarry-stack', self.stackid);
    }
    
    /*
    
      setup the switchboard onto requests so we can do server side
      portal broadcasts
      
    */
    if(!bootstrapreq.switchboard){
      bootstrapreq.switchboard = self.switchboard;
    }
    
    /*
    
      hookup the bootstrap feature for sub-requests
      
    */
    bootstrapreq.on('bootstrap', bootstrap_request);
  }

  function handle(req, res, next){
    bootstrap_request(req);
    handler(req, res, next);
  }

  this.warehouse.use.apply(this.warehouse, [stackpath, handle]);
}