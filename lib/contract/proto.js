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
var util = require('util');
var utils = require('../utils');
var Request = require('./request');
var Response = require('./response');
var eyes = require('eyes');

/*
  Quarry.io - Contract
  --------------------

  A promise based object that acts as the bridge between a container
  and it's API and the low level REST requests that are sent to the network

  The contract is returned from the following container methods:

    selector
    append
    save
    delete

  The 'ship' method acts as a common trigger for a contract (i.e. send it)

  A contract can also be combined into a larger one for piping and merging together

 */

module.exports = Contract;

function Contract(data){
  Request.apply(this, [data]);
  this.setHeader('content-type', 'quarry/contract');
  this.getHeader('x-contract-id') || (this.setHeader('x-contract-id', utils.quarryid()));
  this.getHeader('x-contract-type') || (this.setHeader('x-contract-type', 'merge'));
  this.setType('merge');
  this.method = 'post';
  this.children = [];
}

util.inherits(Contract, Request);


Contract.prototype.toJSON = function(){
  var ret = Request.prototype.toJSON.apply(this);

  ret.body = _.map(this.children, function(child){
    return child.toJSON();
  })
  
  return ret;
}


/*

  trigger the network request
  
*/
Contract.prototype.ship = function(fn){
  var self = this;

  var requestmap = {};

  var mainres = Response.factory(function(){
    self.emit('ship', mainres);

    var answer = self.map_response(mainres);
    fn && fn.apply(answer, [answer]);
  })

  self.supplychain && self.supplychain(self, mainres, function(){
    mainres.send404();
  })

  return this;
}

Contract.prototype.recurse = function(fn){

  function runres(req){
    fn && fn(req);

    if(req.isContract()){
      _.each(req.children || [], function(subreq){
        runres(subreq);
      })
    }
  }

  runres(this);
}

/*

  a function triggered for every step of the contract resolving
  
*/
Contract.prototype.trace = function(fn){
  this.debug(true);
  this.setHeader('x-quarry-trace', true);
}

/*

  merge or pipe
  
*/
Contract.prototype.setType = function(type){
  this.setHeader('x-contract-type', type);
  return this;
}

/*

  this takes the output of the current contract
  and pipes it into the given map function

  it creates a top level contract as oursevles to hold the pipe
  
*/
Contract.prototype.map = function(fn){
  var thischild = new Request(JSON.parse(JSON.stringify(this.toJSON())));

  this.setHeader('content-type', 'quarry/contract');
  this.getHeader('x-contract-id') || (this.setHeader('x-contract-id', utils.quarryid()));
  this.setType('pipe');
  this.method = 'post';
  this.children = [thischild];

  var mapcontract = new Request({
    method:'post',
    path:'/',
    body:fn.toString()
  })

  mapcontract.setHeader('content-type', 'quarry/map');
  mapcontract.setHeader('x-quarry-department', 'map');

  this.add(mapcontract);
  return this;
}

/*

  add a request/other contract to the sequence
  
*/
Contract.prototype.add = function(req){
  var self = this;
  req.getHeader('x-contract-id') || (req.setHeader('x-contract-id', utils.quarryid()));
  this.children.push(req);

  _.each(req.listeners('ship'), function(fn){
    self.on('ship', fn);
  })
  
  return this;
}

/*

  turn the response into the context needed
  
*/
Contract.prototype.map_response = function(res){
  return res;
}