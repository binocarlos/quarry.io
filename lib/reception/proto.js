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
var HoldingBay = require('./HoldingBay');
//var Proto = require('./proto');

var Reception = module.exports = {};


/*
  Quarry.io - Reception
  ---------------------

  


 */

/*


  Constructor




 */


Reception.initialize = function(options){
  options || (options = {});
  this.id = utils.quarryid(true);
  
  return this;
}

Reception.network = function(network){
  this.network = network;
  this.switchboard = network.switchboard();
  this.entrypoint = network.supplychain('/');
  this.holdingbay = new HoldingBay();
  this.register_portals(this.switchboard);
}

Reception.register_portals = function(switchboard){
  switchboard.listen('reception', this.id + '.*', function(message){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('reception portal');
  })
}

Reception.handle = function(req, res, next){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('RECEPTION HANDLE');
  eyes.inspect(this.switchboard);
}