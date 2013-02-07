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

var util = require('util');

var utils = require('../utils');

/*

  quarry.io - supply chain

  abstracts the transport layer of various quarry packets
  
*/

module.exports = SupplyChain;

function SupplyChain(transport){
  EventEmitter.apply(this, []);
}

util.inherits(SupplyChain, EventEmitter);

/*

  RPC
  
*/
SupplyChain.prototype.handle = function(req, res, next){
  
}

SupplyChain.prototype.listen = function(frequency, fn){

}

SupplyChain.prototype.broadcast = function(frequency, message){

}