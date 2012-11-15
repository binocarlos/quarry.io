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
var utils = require('../utils');
var eyes = require('eyes');
var Warehouse = require('../warehouse');



/*
  Quarry.io - Reception
  ---------------------

  A warehouse that looks after the routing to other warehouses




 */

exports = module.exports = factory;

/*

  Returns a factory function to create new containers

  This allows you to customize the container and model behaviour
  before they are instantiated

 */
function factory(options){
  
  options || (options = {});

  var reception = new Warehouse(); 

  // they are in the top level warehouse and searching
  reception.use('/default', function(req, res, next){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('top level warehouse');
  })

  // see if our provider function returns a supplier using the path
  reception.use('/selector', function(req, res, next){

    req.route('test')

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('in reception');

    eyes.inspect(req.toJSON());
    
    /*
    var parts = req.path().split('/');
    var blank = parts.shift();
    var first = parts.shift();
    get_supplier(first, function(error, supplier){
      if(error){
        res.error(error);
        return;
      }
      if(!supplier){
        res.status(404);
        res.send(req.path() + ' not found');
        return;
      }
      req.path('/' + parts.join('/'));
      supplier.handle(req, res, next);  
    })
    */
    
  })

  return reception;
}