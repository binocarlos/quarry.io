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

module.exports = ResolvingRequest;

/*
  Quarry.io - Resolving Request
  ------------------------------

  represents a single backend query that might branch

 */

function ResolvingRequest(bayid, req, res){
  EventEmitter.call(this);

  var stampid = utils.quarryid();

  req.setHeader('x-quarry-bayid', bayid);
  req.setHeader('x-quarry-baystampid', stampid);

  this.bayid = bayid;
  this.id = stampid;
  this.requests = {};

  this.mainreq = req;
  this.mainres = res;

  this.branch(stampid);
}

util.inherits(ResolvingRequest, EventEmitter);

ResolvingRequest.prototype.trigger = function(){
  var is_complete = _.every(this.requests, function(val){
    return val;
  })

  if(is_complete){
    this.emit('complete');
    this.mainres.send();
  }
}

ResolvingRequest.prototype.branch = function(id){
  this.requests[id] = false;
  return this;
}

ResolvingRequest.prototype.branchcomplete = function(id, res){
  this.requests[id] = true;
  this.mainres.add(res);
  this.trigger();
}

ResolvingRequest.prototype.maincomplete = function(res){
  var self = this;
  // ON MAIN COMPLETE
  this.requests[this.id] = true;
  this.mainres.add(res);

  var branches = res.getHeader('x-json-branches') || [];

  /*
  
    the request has branched - we will wait for all answers
    
  */
  if(branches.length>0){
    _.each(branches, function(branchid){
      self.branch(branchid);
    })
  }

  self.trigger();
}