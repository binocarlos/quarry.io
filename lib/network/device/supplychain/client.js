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
var Proto = require('../proto');
var Warehouse = require('../../../warehouse');
var JSONClient = require('../json/client');
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
  Proto.apply(this, [options]);

  log.info('creating supply chain client');

  this.rpc = new JSONClient({
    id:this.id + ':database',
    endpoints:this.endpoints
  })

  this.switchboard = new SwitchboardClient({
    id:this.id + ':switchboard',
    endpoints:this.endpoints
  })

  

}

util.inherits(SupplyChainClient, Proto);

/*

   in bind mode we are a single socket
  
*/
SupplyChainClient.prototype.connect = function(mountpath, callback){

  var self = this;

  if(!callback){
    callback = mountpath;
    mountpath = null;
  }
  log.info(dye.magenta('connecting') + ' SystemServer');

  this.rpc.connect();
  this.switchboard.connect();
  
  var container = Container.new({
    meta:{
      quarrysupplier:(self.options.stackpath!='/' ? self.options.stackpath : '')  + (mountpath ? mountpath : ''),
      supplychainroot:true
    }
  })
  
  function supplychain(req, res, next){

    log.info('supplychain send: ' + req.summary());
    
    self.rpc.send(req.toJSON(), function(answerpacket){
      res.fill(answerpacket);
    })
  }

  /*
  
    merge the switchboard into the supplychain and provide it
    to the container
    
  */
  supplychain.switchboard = this.switchboard;
  container.supplychain = supplychain;

  callback(container); 

  return this;
}