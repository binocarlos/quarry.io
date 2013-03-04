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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var _ = require('lodash');

var dye = require('dye');
var Device = require('../device');


module.exports = function(worker, system){

  return function(spark, callback){

    var trim = {};


    /*
    
      the stackpath is worked out by the allocation

      at the beginning - all nodes are allocated to the default
      worker which has the root stack path '/'

      further stack routing happens wuthin the supplychain warehouse
      
    */
    async.series([

      /*
      
        back
        
      */
      function(next){

        Device('node.rpcserver', {
          db:system.db,
          spark:spark,
          systemconfig:system.config,
          department:'functional'
        }, function(error, backtrim){
          _.extend(trim, backtrim);
          next();
        })

      },
      /*
      
        front
        
      */
      function(next){

        Device('node.rpcclient', {
          db:system.db,
          spark:spark,
          systemconfig:system.config          
        }, function(error, fronttrim){
          _.extend(trim, fronttrim);
          next();
        })

      }

    ], function(error){

      callback(error, trim);
    })
  }
  
}