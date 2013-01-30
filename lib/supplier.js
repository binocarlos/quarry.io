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
var Warehouse = require('./warehouse');

var drivers = {
  container:require('./supplier/container'),
  rest:require('./supplier/rest'),
  quarrydb:require('./supplier/quarrydb')
}

var middleware = {
  contractresolver:require('./supplier/middleware/contractresolver'),
  selectorextractor:require('./supplier/middleware/selectorextractor'),
  selectorresolver:require('./supplier/middleware/selectorresolver'),
  skeletonextractor:require('./supplier/middleware/skeletonextractor')
}

module.exports = factory;

/*

  supplier constructor
  
*/

function factory(){

  var supplier = Warehouse();
  
  return supplier;

}

/*

  expose each of the drivers via

  io.supplier.quarrydb

  and the middleware via

  io.middleware.contractresolver
  
*/

_.extend(factory, drivers);
factory.middleware = middleware;