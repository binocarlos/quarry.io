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
