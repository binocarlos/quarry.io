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
var utils = require('../../utils');
var eyes = require('eyes');

var DevelopmentNetworkClient = module.exports = {};


/*
  Quarry.io - Development Network Client
  --------------------------------------

  


 */

DevelopmentNetworkClient.supplychain = function(allocation){
  if(!this.options.supplychain_factory){
    throw new Error('Development Network Client expects this.options.supplychain_factory');
  }

  return this.options.supplychain_factory(allocation);
}

DevelopmentNetworkClient.route = function(req, res){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('at dev network router');
  if(!this.options.router){
    throw new Error('Development Network Client expects this.options.router');
  }

  return this.options.router(req, res);
}

DevelopmentNetworkClient.branch = function(req, body){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('at dev network branch');
 
  return this.broadcast('holdingbay', req.header('holdingbay_id'), {
    action:'branch',
    request:req.toJSON(),
    body:body
  })
}

DevelopmentNetworkClient.broadcast = function(station, frequency, message){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('at dev network broadcast');
  if(!this.options.switchboard){
    throw new Error('Development Network Client expects this.options.switchboard');
  }

  return this.options.switchboard.broadcast(station, frequency, message);
}

DevelopmentNetworkClient.listen = function(station, frequency, fn){
  return this.options.switchboard.listen(station, frequency, fn);
}