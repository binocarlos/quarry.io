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

var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    containerFactory = require('../container'),
    eyes = require('eyes'),
    async = require('async');
    
/*
  Quarry.io Switchboard Supply Chain
  --------------------------------

  wraps another supply chain and emits and event from each packet once it has
  returned from the original supply chain

  it also passes the packet back to the original callback

 */

module.exports = factory;

function factory(){

  // the names of actions that are not broadcast
  var silent_actions = {

  }
  // the array of listening functions
  var stack = [];

  function switchboard(error, packet){

    //console.log('switchboard');
    //eyes.inspect(packet);

  }

  switchboard.use = function(fn){
    stack.push(fn);
    return this;
  }

  return switchboard;
}