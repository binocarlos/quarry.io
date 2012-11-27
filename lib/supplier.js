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
var resolver = require('./supplier/resolver');

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

  function new_supplier(req, ready){
    var supplier_options = _.clone(options);
    supplier_options.route = req.originalPath();
    supplier_options.path = req.path();
    supplier_options.network = req.network;

    Factory(supplier_options, ready);
  }

  function ensure_supplier(req, res, ready){
    var path = req.path();

    if(cache[path]){
      ready(null, cache[path]);
      return;
    }

    new_supplier(req, function(error, supplier){
      if(error){
        ready(error);
        return;
      }
      cache[path] = supplier;
      ready(null, supplier);
    })
  }

  var warehouse = new Warehouse(options);

  // GET queries are split up into a selector pipe contract
  warehouse.get(function(req, res, next){

    ensure_supplier(req, res, function(error, supplier){

      if(error){
        res.sendError(error);
        return;
      }

      if(req.param('selector')){

        resolver({
          req:req,
          supplychain:warehouse.get_handler(),
          skeleton:[{
            // we chunk the path because it contains the db reference as well as the id for the skeleton
            meta:{
              quarryid:req.chunk_path()  
            }
          }]
        }, function(error, results){
          if(error){
            res.sendError(error);
          }
          else{
            res.send(results);
          }
        })
      }
      else{
        next();
      }
      
      
    })
    
  })

  // all other queries (PUT/POST/DELETE are sent direct to the supplier)
  warehouse.use(function(req, res, next){

    ensure_supplier(req, res, function(error, supplier){

      if(error){
        res.sendError(error);
        return;
      }

      supplier.handle(req, res, next);

    })
  })
  
  return warehouse;
}