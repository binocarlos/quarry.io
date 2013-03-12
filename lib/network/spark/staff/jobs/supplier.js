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


var utils = require('../../../../utils')
  , eyes = require('eyes')
  , async = require('async')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Device = require('../../../device');
var Warehouse = require('../../../../warehouse');
var Container = require('../../../../container');
var Supplier = require('../../../../supplier');

/*

  Quarry.io - Warehouse
  ---------------------

  
*/

module.exports = function(job){

  job.prepare = function(done){

    var stack = {};
    var warehouse = null;

    function addsupplier(container, added){
      var config = container.attr();
      var route = container.attr('route');
      config.id = container.quarryid();
      var supplier = Supplier(container.attr('module'), config, job.network);
      stack.warehouse.mount(route, supplier);
      added();
    }

    async.series([
      function(next){
        job.get_reception_back(function(error, warehouse){
          stack.warehouse = warehouse;
          warehouse.warehouse.use(function(req, res, next){
            console.log('-------------------------------------------');
            console.log('-------------------------------------------');
            console.log('here');
            process.exit();
          })
          next();
        })
      },

      function(next){
        job.get_reception_front(function(error, receptionfront){
          stack.receptionfront = receptionfront;
          job.network.receptionfront = receptionfront;
          next();
        })
      },

      function(next){
        var jobcontainer = job.jobcontainer;

        async.forEachSeries(jobcontainer.children().containers(), function(supplier, nextsupplier){

          addsupplier(supplier, nextsupplier);

        }, next)
        
      }
      
    ], done)
    

  }

  return job;
}