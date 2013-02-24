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
var dye = require('dye');
var _ = require('lodash');
var async = require('async');
var log = require('logule').init(module, 'API NODE Section');

var Container = require('../../../container');
var Section = require('./proto');

/*

  quarry.io - API server section

  
*/

module.exports = APISection;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function APISection(options){
  Section.apply(this, [options]);
}

util.inherits(APISection, Section);

APISection.prototype.add_extra_services = function(node, callback){
  
  /*
  var codefolder = this.stackconfig.options.config.codefolder;

  var service = Container.new('service', {
    "name":"Stack Code",
    "mount":"/quarry/src",
    "module":"quarry.filesystem.directory",
    "directory":codefolder
  })

  node.append(service);
  */

  callback();
}