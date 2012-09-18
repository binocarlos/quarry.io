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

var EventEmitter = require('events').EventEmitter
  , path = require('path')
  , basename = path.basename
  , fs = require('fs');

/*
  Quarry.io
  ---------

  The main entry function for the quarry.io library


 */

/***********************************************************************************
 ***********************************************************************************
  


 */

exports.version = '0.0.1';


/*
  return a new warehouse with the given data
 */
exports.warehouse = require('./warehouse/container');

exports.container = exports.warehouse;

/*
  expose the suppliers to the public API
 */

exports.supplier = {};

fs.readdirSync(__dirname + '/warehouse/supply_chain').forEach(function(filename){
  if (!/\.js$/.test(filename)) return;
  var name = basename(filename, '.js');
  function load(){ return require('./warehouse/supply_chain/' + name); }
  module.exports.__defineGetter__(name, load);
  module.exports.supplier.__defineGetter__(name, load);
})



