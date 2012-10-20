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

var utils = require('../utils');
var _ = require('underscore');
var selectorParser = require('../container/selector');
var packetFactory = require('../packet');
var eyes = require('eyes');

module.exports = factory;

/*
  Quarry.io Contract
  ------------------

  A collection of queries in a sequence

  A query is:

  // a merge is do each query seperate and just stick the results all together
  {
    type:'merge',
    data:[selectors]
  }

  // a pipe is a sequence where you send the results of one to the next
  {
    type:'pipe',
    data:[selectors]
  }

 */

function factory(data){
  function contract(){}

  contract._contract = data;

  _.extend(contract, Contract);

  return contract;
}

function data_factory(type, packets){

  if(packets.length==1){
    return packets[0];
  }

  return {
    type:type || 'merge',
    packets:packets || []
  }
}

function integrate_factory(type){
  return function(){
    var self = this;
    if(arguments.length<=0){
      return this;
    }
    var arr = arguments[0];

    if(!_.isArray(arr)){
      arr = [arr];
    }

    if(!this._contract){
      this._contract = data_factory(type, arr);
    }
    else{
      // merge them because they are the same
      if(this._contract.type==type){
        _.each(arr, function(single){
          self._contract.packets.push(single);
        })
      }
      else{
        // make a new contract where the last contract is first up in the sequence
        this._contract = data_factory(type, [this._contract].concat(arr));
      }
    }

    return this;
  }
}

function phase_factory(phase){
  return data_factory('pipe', _.map(phase, function(stage){
    return packetFactory.select(stage);
  }))
}

var Contract = {};

Contract.pipe = integrate_factory('pipe');

Contract.merge = integrate_factory('merge');

Contract.branch = integrate_factory('branch');

Contract.selector = function(selector_string){

  if(_.isEmpty(selector_string)){
    return this;
  }

  var self = this;

  var phases = selectorParser(selector_string);

  this.branch(data_factory('merge', _.map(phases, phase_factory)));

  return this;
}

Contract.toJSON = function(){

  function nonulls(val){
    return !_.isUndefined(val) && !_.isNull(val);
  }

  function reduce(stage){
    stage = _.isFunction(stage) ? stage.toJSON() : stage ? stage : {};

    if(stage.packets){
      stage.packets = _.filter(_.map(stage.packets, reduce), nonulls);
    }

    return stage;
  }

  return reduce(this._contract);
}