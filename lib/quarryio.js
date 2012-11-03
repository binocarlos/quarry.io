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

var Warehouse = require('./warehouse');
var Container = require('./container');
var backbonenested = require('./vendor/backbonenested');
var Supplier = require('./warehouse/supplier');
var Provider = require('./warehouse/provider');
var Packet = require('./packet');
var Router = require('./warehouse/router');
var utils = require('./utils');

/*
  Quarry.io
  ---------

  This is the generic entry point


 */

var io = {

  version:'0.0.2'

}

module.exports = io;

/*
  generates a warehouse which can reduce contracts and route packets
 */
io.warehouse = function(options){

  return new Warehouse(options);

}

/*
  create a new container with no warehouse
 */
io.new = Container;

/*
  Bootstrap a new supplier Warehouse and return it's supply chain
 */
io.supplier = function(type, config){
  var apiwrapper = require('./supplier/' + type);
  var api = apiwrapper(config);

  return Supplier.factory(api, config);
}

io.provider = function(options){
  return Provider.factory(options);
}

io.supplierchain = function(type, config){
  var supplier = this.supplier(type, config);

  return supplier.supplychain();
}

/*
  Make a new routing warehouse
 */
io.router = function(config){
  return Router.factory(config);
}

/*
  A factory for the packet api
 */
io.packet = function(data){
  return Packet(data);
}

/*
  Model factory for warehouses to pass to containers
 */
io.model = function(instance_props, class_props){
  return backbonenested.extend(instance_props, class_props);
}