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

var Supplier = require('../supplier');

/*

  Quarry.io - Rest Supplier
  -------------------------

  very basic mapping of REST functions onto api functions
  
*/

module.exports = function(api){

  var app = Supplier();

  _.each(api, function(fn, method){

    // this means any method on a given URL
    if(method.indexOf('/')==0){
      app.use(method, fn);
    }
    // this means a REST method on any URL
    else{
      app[method].apply(app, [fn]);
    }
    
  })
  
  return app;
}
