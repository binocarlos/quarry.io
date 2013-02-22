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


var utils = require('../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var Warehouse = require('../warehouse');
var Supplier = require('../supplier');
var log = require('logule').init(module, 'Provider');

/*

  Quarry.io - Provider
  --------------------

  One level up from suppliers

  A provider is a collection of suppliers - you can POST to a provider to
  create a new supplier
  
*/

module.exports = function(options, system){

  var warehouse = Warehouse();

  var suppliers = {};

  function ensuresupplier(id, callback){
    if(suppliers[id]){
      callback(null, suppliers[id]);
      return;
    }
    var createoptions = _.extend({}, options.supplier);

    _.each(createoptions, function(val, prop){
      if(val=='__id'){
        createoptions[prop] = id;
      }
    })
    var supplier = Supplier(createoptions.module, createoptions, system);
    suppliers[id] = supplier;
    callback(null, supplier);
  }

  warehouse.use(function(req, res, next){
    if(req.url!='/'){
      var parts = req.path.split('/');
      var blank = parts.shift();
      var id = parts.shift();

      ensuresupplier(id, function(error, supplier){
        if(error){
          res.error(error);
          return;
        }
        req.setHeader('x-quarry-supplier', req.getHeader('x-quarry-supplier') + '/' + id);
        supplier(req, res, next);
      })
    }
    else{
      next();
    }
  })

  return warehouse;
}