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

/*
  Quarry.io - RPC Client
  -----------------------

  

  

 */

module.exports = SystemClient;

function SystemClient(){
  EventEmitter.call(this);
  log.info('creating system client');
}

util.inherits(SystemClient, EventEmitter);

SystemClient.prototype.connect = function(endpoints, fn){
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

  rpcclient.connect(endpoints.rpc);
  switchboard.connect(endpoints.pub, endpoints.sub);

  var warehouse = supplychain.connect('/systemdb');

  fn && fn(warehouse);

  return warehouse;
}
