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
var deck = require('deck');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var log = require('logule').init(module, 'Reception Router');

module.exports = HoldingBay;

/*
  Quarry.io - Reception Holdingbay
  --------------------------------

  keeps hold of the resolving contracts

  listens on the switchboard for feedback loops

 */

function HoldingBay(options){

  var switchboard = options.switchboard;

  if(!switchboard){
    throw new Error('HoldingBay Server requires a switchboard');
  }

  var holdingbay = {
    /*
    
      the id that will be used on the switchboard feedback loop
      
    */
    id:utils.littleid(),

    /*
    
      a map of currently resolving contracts by id
      
    */
    contracts:{},

    route:function(header, packet){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('holding bay route: ');
      eyes.inspect(header);
      eyes.inspect(packet);
      process.exit();
      
    }
  }

  _.extend(holdingbay, EventEmitter.prototype);

  switchboard.listen('holdingbay.' + holdingbay.id, function(){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('Holding bay feedback');
  })

  return holdingbay;
}