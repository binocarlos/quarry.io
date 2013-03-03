/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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

module.exports = function(options){

  var suppliers = {};

  /*
  
    the process function can add in extra config just before
    we boot a supplier
    
  */
  var processoptions = options.processoptions || function(options, id){
    return options;
  }

  function ensuresupplier(id, callback){
    if(suppliers[id]){
      callback(null, suppliers[id]);
      return;
    }
    var createoptions = _.extend({}, options.supplier);
    createoptions = processoptions(createoptions, id);

    var supplier = Supplier(createoptions.module, createoptions);
    suppliers[id] = supplier;
    callback(null, supplier);
  }

  return function(req, res, next){

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
  }
}