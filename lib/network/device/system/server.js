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
var dye = require('dye');
var log = require('logule').init(module, 'System Client');
var Device = require('../../device');
var supplier = require('../../../supplier');

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

module.exports = SystemServer;

function SystemServer(options){
  EventEmitter.call(this);
  log.info('creating system server');
  this.options = options || {};
}

util.inherits(SystemServer, EventEmitter);

SystemServer.prototype.bind = function(endpoints){
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
    stackid:'system'
  })

  var db = supplier.quarrydb(_.extend({
    collection:'quarry.system',
    reset:true
  }, self.options.servers.mongo));

  var wrapper = supplychain.wrapper('/systemdb', db);
  supplychain.use(wrapper);

  /*
  
    routes packets from our network into the supplychain
    
  */
  rpcserver.on('message', function(packet, callback){
    supplychain.handle(packet, callback);
  })

  rpcserver.bind(endpoints.rpc);
  switchboardclient.connect(endpoints.pub, endpoints.sub);
  switchboardserver.bind(endpoints.pub, endpoints.sub);

  return this;
}
