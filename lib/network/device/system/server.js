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
var Supplier = require('../../../supplier');
var ResolveContract = require('../../../warehouse/resolvecontract');

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

module.exports = SystemServer;

/*

  systemconfig

*/
function SystemServer(options){
  EventEmitter.call(this);  
  this.options = options || {};

  this.systemconfig = this.options.systemconfig;
  this.mongo = this.systemconfig.attr('servers.mongo');
  this.endpoints = this.systemconfig.attr('systemendpoints');
}

util.inherits(SystemServer, EventEmitter);

SystemServer.prototype.bind = function(){
  var self = this;
  var switchboardserver = Device('switchboard.server', {
    id:'system.switchboard',
    pub:Device.socket('pub'),
    sub:Device.socket('sub')
  })

  var rpcserver = Device('rpc.server', {
    json:true,
    socket:Device.socket('router')
  })

  var switchboardclient = Device('switchboard.client', {
    id:'system.switchboard',
    pub:Device.socket('pub'),
    sub:Device.socket('sub')
  })

  var supplychain = Device('supplychain.server', {
    switchboard:switchboardclient,
    rpc:rpcserver,
    stackid:'system'
  })

  var provider = Supplier('provider', _.extend({
    processoptions:function(options, id){
      options.collection = 'system.stack.' + id;
      return options;
    },
    supplier:{
      module:"quarry.quarrydb",
      reset:true
    }
  }, this.mongo));

  var resolver = ResolveContract(supplychain.warehouse);

  supplychain.use(resolver);
  supplychain.use('/systemdb', provider);

  /*
  
    routes packets from our network into the supplychain
    
  
  rpcserver.on('message', function(packet, callback){
    supplychain.handle(packet, callback);
  })

  */

  rpcserver.bind(this.endpoints.rpc);
  switchboardclient.connect(this.endpoints.pub, this.endpoints.sub);
  switchboardserver.bind(this.endpoints.pub, this.endpoints.sub);

  return this;
}
