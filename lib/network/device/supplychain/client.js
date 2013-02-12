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
var log = require('logule').init(module, 'Supply Chain Client');
var Warehouse = require('../../../warehouse');

var SwitchboardClient = require('../switchboard/client');
var Contract = require('../../../contract');
var Container = require('../../../container');

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

  log.info('creating supply chain client');
  
}

util.inherits(SupplyChainClient, EventEmitter);

/*

   in bind mode we are a single socket
  
*/
SupplyChainClient.prototype.connect = function(mountpath, callback){

  var self = this;

  var switchboard = this.options.switchboard;
  var stackpath = this.options.stackpath;
  var stackid = this.options.stackid;

  if(!callback){
    callback = mountpath;
    mountpath = null;
  }
  
  var container = Container.new({
    meta:{
      quarrysupplier:(stackpath!='/' ? stackpath : '')  + (mountpath ? mountpath : ''),
      supplychainroot:true
    }
  })
  
  function supplychain(req, res, next){

    log.info('supplychain send: ' + req.summary());

    self.emit('request', req.toJSON(), function(answerpacket){
      res.fill(answerpacket);
    })
  }

  /*
  
    merge the switchboard into the supplychain and provide it
    to the container
    
  */
  supplychain.switchboard = switchboard;
  container.supplychain = supplychain;

  callback(container); 

  return this;
}