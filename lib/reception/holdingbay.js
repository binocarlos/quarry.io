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

var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var eyes = require('eyes');
var queries = require('../query/factory');
var Contract = require('./contract');
//var Proto = require('./proto');

module.exports = HoldingBay;


/*
  Quarry.io - HoldingBay
  ----------------------

  Keeps track of branching queries inside of the reception


 */

/*


  Constructor




 */

function HoldingBay(options){
  options || (options = {});
  this.id = options.id || utils.quarryid();
  this.contracts = {};
}

HoldingBay.prototype.process_message = function(message){
  if(!this[message.action]){
    throw new Error(message.action + ' was not found on the holdingbay');
  }

  return this[message.action].apply(this, [message]);
}

HoldingBay.prototype.make_contract = function(callback){
  return new Contract({
    bay_id:this.id,
    finished_callback:callback
  })
}

HoldingBay.prototype.register = function(req, callback){

  var contract = this.make_contract(callback);

  this.contracts[contract.id] = contract;

  return contract.add_request(req);
}


HoldingBay.prototype.redirect = function(req){
  var contract = this.contracts[req.contract_id()];
  return contract.replace_request(req);
}

HoldingBay.prototype.branch = function(req){
  var contract = this.contracts[req.contract_id()];
  return contract.add_request(req);
}

