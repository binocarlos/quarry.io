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
var log = require('logule').init(module, 'Supply Chain Server');
var Proto = require('../proto');
var Warehouse = require('../../../warehouse');
var JSONServer = require('../json/server');
var SwitchboardServer = require('../switchboard/server');
var Contract = require('../../../contract');

module.exports = ReceptionServer;

/*
  Quarry.io - SupplyChain Server
  ------------------------------

  A JSON server that hooks into a warehouse
  and connects a switchboard client

  

 */

function ReceptionServer(options){
  Proto.apply(this, [options]);

  log.info('creating reception server');

  this.front = this.get_socket('router');
  this.front.on('message', _.bind(this.handlefront, this));

  this.back = this.get_socket('dealer');
  this.back.on('message', _.bind(this.handleback, this));

  this.switchboard = new SwitchboardServer({
    id:this.id + ':switchboard',
    endpoints:this.options.endpoints
  })

  this.front.on('message', _.bind(this.handlefront, this));
  this.back.on('message', _.bind(this.handleback, this));

}

util.inherits(ReceptionServer, Proto);

ReceptionServer.prototype.bind = function(){

  log.info(dye.magenta('binding') + ' Reception Server');

  log.info(dye.magenta('binding') + ' FRONT: ' + dye.red(this.endpoints.front));
  this.front.bindSync(this.endpoints.front);
  log.info(dye.magenta('binding') + ' BACK: ' + dye.red(this.endpoints.back));
  this.back.bindSync(this.endpoints.back);

  this.switchboard.bind();
  
  return this;
}

ReceptionServer.prototype.handlefront = function(){
  var self = this;
  
  console.log('-------------------------------------------');
  console.log('reception front message');
  process.exit();
  
}

ReceptionServer.prototype.handleback = function(){
  var self = this;
  
  console.log('-------------------------------------------');
  console.log('reception front message');
  process.exit();
  
}