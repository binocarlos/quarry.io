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
