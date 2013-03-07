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


var utils = require('../../../utils')
  , eyes = require('eyes')
  , async = require('async')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

/*

  Quarry.io - Planner
  -------------------

  Knows how to allocate workers onto jobs
  
*/

module.exports = function(options){

  var map = options.map;

  var workforce = options.workforce;
  var joblist = options.joblist;

  var workforcedb = workforce.container;
  var joblistdb = joblist.container;

  var planner = _.extend({
    
    prepare:function(done){
      done();
      return this;
    },

    /*
    
      the initial allocate step

      we slurp in workers and decide what jobs
      to give to each
      
    */
    begin:function(done){
      var workers = workforcedb.find('worker');

      var counter = 0;

      /*
      
        this is a very basic allocation of one worker per department

        the worker choosen loops back - this means all work within a department
        is allocated to the same worker to begin (a sensible start perhaps)
        
      */
      function getworker(){
        var worker = workers.eq(counter);
        counter++;
        if(counter>=workers.count()){
          counter = 0;
        }
        return worker;
      }

      async.forEach(joblistdb.find('department').containers(), function(department, nextdepartment){

        var worker = getworker();

        async.forEach(department.find('job').containers(), function(job, nextjob){
          
          console.log('-------------------------------------------');
          console.log('allocation job to worker');
          worker.look();
          console.log('-------------------------------------------');
          job.look();
          nextjob();


        }, nextdepartment)
      }, done)
      
      
    }

  }, options)

  _.extend(planner, EventEmitter.prototype);

  return planner;
}