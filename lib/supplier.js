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
var utils = require('./utils');
var eyes = require('eyes');
var Backbone = require('./vendor/backbone');
var Warehouse = require('./warehouse');
var Proto = require('./supplier/proto');
var Factory = require('./supplier/factory');

/*
  Quarry.io - Supplier
  --------------------

  A warehouse that deals with a single database driver


 */

exports = module.exports = factory;

/*

  Returns a factory function to create new containers

  This allows you to customize the container and model behaviour
  before they are instantiated

 */
function factory(options){
  options || (options = {})

  // the cache of driver apis based on the path
  var cache = {};

  // what driver api are we representing
  var driver = options.driver;

  if(!driver){
    throw new Error('Supplier factory needs a driver');
  }

  // load the api
  var api = require('./supplier/' + driver.replace(/\./g, '/'));

  function new_supplier(path, ready){
    var supplier_options = _.clone(options);
    supplier_options.path = path;
    Factory(supplier_options, ready);
  }

  function ensure_supplier(path, ready){
    if(cache[path]){
      ready(null, cache[path]);
      return;
    }

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('ensure supplier: ' + path);

    new_supplier(path, function(error, supplier){
      if(error){
        ready(error);
        return;
      }
      cache[path] = supplier;
      ready(null, supplier);
    })
  }

  var warehouse = new Warehouse(options);

  warehouse.use(function(req, res, next){

    eyes.inspect(req.toJSON());
    return;
    ensure_supplier(req.path(), function(error, supplier){
      if(error){
        res.sendError(error);
        return;
      }

      if(!supplier[req.method()]){
        res.send404();
        return;
      }

      supplier.handle(req, res, next);

    })
  })

  return warehouse;
}