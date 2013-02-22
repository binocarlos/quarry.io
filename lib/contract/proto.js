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

  var cleanups = [];

  var mainres = Response.factory(function(){

    _.each(cleanups, function(cleanup){
      cleanup();
    })

    if(mainres.hasError()){
      self.emit('error', mainres);
      return;
    }

    self.emit('ship', mainres);

    mainres.recurse(function(res){
      var req = requestmap[res.getHeader('x-contract-id')];

      if(!req){
        return;
      }

      if(res.hasError()){
        req.emit('problem', res);
      }
      else{
        req.emit('complete', res);
      }

      req.removeAllListeners();
    })

    var answer = self.map_response(mainres);
    fn && fn.apply(answer, [answer]);
  })

  self.recurse(function(req){
    requestmap[req.getHeader('x-contract-id')] = req;

    if(req.debug()){
      _.each(req.debugcallbacks, function(fn){
        self.supplychain.switchboard.listen('debug:' + req.getHeader('x-contract-id'), fn);  
        cleanups.push(function(){
          self.supplychain.switchboard.cancel('debug:' + req.getHeader('x-contract-id'), fn);    
        })
      })
    }
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

  add a request/other contract to the sequence
  
*/
Contract.prototype.add = function(req){
  req.getHeader('x-contract-id') || (req.setHeader('x-contract-id', utils.quarryid()));
  req.setHeader('x-contract-parent-id', this.getHeader('x-contract-id'));
  req.setHeader('x-contract-index', this.children.length);
  this.children.push(req);
  return this;
}

/*

  turn the response into the context needed
  
*/
Contract.prototype.map_response = function(res){
  return res;
}