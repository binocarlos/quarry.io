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
var utils = require('../utils');
var eyes = require('eyes');
var Warehouse = require('../warehouse');
var ThreadServer = require('./server');

module.exports = factory;

/*
  Quarry.io - Script Thread Server
  --------------------------------

  A server-side quarryscript processor

  This can be invoked as part of a HTML page (like PHP)

  Or it can be directly invoked over HTTP (like /scripts POST a form mode)


 */

function factory(options, system){

  var server = new ThreadServer(options);

  var warehouse = Warehouse();

  warehouse.post(function(req, res, next){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('SCRIPT SERVER');

    eyes.inspect(req.getHeader('x-quarry-script'));
  })

  warehouse.use(function(req, res, next){
    res.send404();
  })

  return warehouse;
}