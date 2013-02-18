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

  log.info('creating supply chain client');
  
}

util.inherits(SupplyChainClient, EventEmitter);

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

    log.info('supplychain send: ' + req.summary());

    var sendargs = [JSON.stringify(req.getcontractheader()), req.toJSON(), function(routingheader, answerpacket){
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
  container.connect = function(submountpath, callback){
    var fullpath = [mountpath, submountpath].join('/').replace(/\/\//g, '/');

    return self.connect(fullpath);
  }

  return container;
}