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

DevelopmentNetworkClient.resource = function(type){
  return this.options.resources[type];
}

DevelopmentNetworkClient.localfiles = function(){
  return this.resource('localfiles');
}

DevelopmentNetworkClient.supplychain = function(path){
  if(!this.options.supplychain){
    throw new Error('Development Network Client supplychain needed');
  }

  return this.options.supplychain(path);
}

DevelopmentNetworkClient.reception = function(){
  if(!this.options.reception){
    throw new Error('Development Network Client reception needed');
  }

  return this.options.reception();
}

DevelopmentNetworkClient.switchboard = function(){
  if(!this.options.switchboard){
    throw new Error('Development Network Client switchboard needed');
  }

  return this.options.switchboard();
}