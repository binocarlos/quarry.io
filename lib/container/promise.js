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
var packetFactory = require('../packet');
var eyes = require('eyes');

module.exports = Promise;

/*
  Quarry.io - Promise
  -------------------

  The promise that is returned by running a container selector


 */

function Promise(skeleton, warehouse){
  this._skeleton = skeleton;
  this._warehouse = warehouse;
  this._packet = packetFactory();
  this._loader = null;
  this._callback_stack = [];
}

/*
  give the promise the function it needs to actually load data

  the loader expects:

    contract_json, callback
 */
Promise.prototype.loader = function(loader_function){
  this._loader = loader_function;
  return this;
}

/*
  add onto the callback for when we are loaded
 */
Promise.prototype.use = function(callback_function){
  this._callback_stack.push(callback_function);
  return this;
}

/*
  The trigger method - this is called at the end of the
  building up the contract chain
 */
Promise.prototype.ship = function(callback){
  if(!this._loader){
    throw new Error('there is a promise with no loader!')
  }
  this.use(callback);
  this._loader.apply(this, [this._packet]);
  return this;
}

/*
  The results are back and there is a container for us
 */
Promise.prototype.keep = function(container){
  var self = this;

  _.each(this._callback_stack, function(callback_function){
    callback_function.apply(container, [container]);
  })
  this._callback_stack = [];
  return this;
}


/*
  add an array of selectors to the contract in a pipe config
 */
Promise.prototype.pipe = function(packet){
  this._packet.pipe(arr);
  return this;
}

/*
  merge the results from these selectors into the final results
 */
Promise.prototype.merge = function(packet){
  this._packet.merge(arr);
  return this;
}

/*
  merge the results from these selectors into the final results
 */
Promise.prototype.branch = function(packet){
  this._packet.branch(selector);
  return this;
}

Promise.prototype.selector_sequence = function(selectors){

  var self = this;

  selectors = selectors.reverse();

  _.each(selectors, function(selector){
    self.selector(selector);
  })

  this._packet.req.param('input', self._skeleton);
  
  return this;
}

Promise.prototype.selector = function(selector_string){

  var select_packet = packetFactory();

  select_packet.protocol('quarry');
  select_packet.path('/selector');
  select_packet.req.body(selector_string);

  this._packet.branch(select_packet);
  
  return this;
}