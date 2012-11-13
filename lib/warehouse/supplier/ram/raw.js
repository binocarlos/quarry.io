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
var utils = require('../../..//utils');
var eyes = require('eyes');
var cacheFactory = require('../../../container/cache');
var Warehouse = require('../../../warehouse');
var Container = require('../../../container');


/*
  Quarry.io - RAM Supplier
  ------------------------

  Holds containers in memory and performs actions


 */

var api = {};

function factory(options){
  options || (options = {});

  var cache = cacheFactory(options);
  var warehouse = new Warehouse();

  cache.on('message', function(message){
    warehouse.trigger('message', message);
  })

  warehouse.use(function(req, res, next){
    console.log('-------------------------------------------');
    console.log('in eaw');
    eyes.inspect(req.toJSON());
  })
  
  warehouse.get(function(req, res, next){
    var id = req.pathid();
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('raw select');
    
  })

  warehouse.post(function(req, res, next){
    warehouse.trigger('changed');
  })

  warehouse.put(function(req, res, next){
    warehouse.trigger('changed');
  })

  warehouse.delete(function(req, res, next){
    warehouse.trigger('changed');
  })

  warehouse.cache = cache;

  return warehouse;
}

exports = module.exports = factory;