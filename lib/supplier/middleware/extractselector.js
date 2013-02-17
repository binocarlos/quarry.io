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
var eyes = require('eyes');
var inspectselect = require('inspectselect');

/*
  Quarry.io - Selector Extractor
  ------------------------------

  Extracts the selector into a uniform JSON header

  The selector is always an array of selectors

      container('product.onsale', 'shop#a, shop#b').ship(function(){})

  The above is 2 selector strings in a pipe array
  (the strings are reversed - in the above example, the shops first then products)

 */

module.exports = factory;

function factory(){

  return function(req, res, next){

    
    /*
    
       lets see if there is a skeleton passed as a JSON header
      
    */
    if(req.getHeader('x-json-selectors')){
      next();
      return;
    }

    /*
    
      Lets see if there is an ID tacked onto the end of the path
      
    */

    req.setHeader('x-json-selectors', [inspectselect(req.query.q || req.query.selector)]);
    
    next();
  }
}