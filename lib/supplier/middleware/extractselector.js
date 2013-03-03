/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var inspectselect = require('../../container/inspectselect');

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