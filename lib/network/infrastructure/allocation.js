/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var _ = require('lodash');

var Node = require('../node');

/*

  quarry.io - infrastructure allocation

  represents what instances the infrestructure has given to a stack

  the stack decides how to allocate workers onto it's allocated instances

  
*/

module.exports = Allocation;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function Allocation(instances){
  EventEmitter.call(this);
  this.initialize(instances);
}

util.inherits(Allocation, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
Allocation.prototype.initialize = function(instances){
  this.instances = instances;
  return this;
}

/*

  the initial creation of one worker per role
  
*/
Allocation.prototype.get_initial_workers = function(){

  var arr = this.instances.containers();
  var index = 0;

  function getinstance(){
    var ret = arr[index];
    index++;
    if(index>=arr.length){
      index = 0;
    }
    return ret;
  }

  return _.map(Node.stackflavours, function(flavour){
    return {
      flavour:flavour,
      instance:getinstance()
    }
  })
}