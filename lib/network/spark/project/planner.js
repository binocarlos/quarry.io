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
var Departments = require('../../../department');
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
  var workforcedb = workforce.container;

  var stack = options.stack;

  var map = options.map;
  var mapdb = map.container;

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
      var self = this;
      var workers = workforcedb.find('worker');

      function getdepartmentstaff(department){
        var depworkers = workers;// MATCH DEPARTMENT HERE
        var depcounter = 0;
        return {
          name:department,
          hire:function(job){
            var worker = depworkers.eq(depcounter);
            depcounter++;
            if(depcounter>=depworkers.count()){
              depcounter = 0;
            }
            return depworkers.eq(depcounter);// MATCH JOB HERE
          }
        }
      }

      if(stack.find('department').count()<=0){
        throw new Error('there were no departments loaded for the stack');
      }

      var departments = _.sortBy(stack.find('department').containers(), function(department){
        return Departments.bootfirst[department.title()] ? 0 : 1;
      })

      async.forEachSeries(departments, function(department, nextdepartment){

        var name = department.attr('name');
        var staff = getdepartmentstaff(department);
        
        async.forEachSeries(department.find('job').containers(), function(job, nextjob){

          /*
          
            we have a pre-allocation of how many times a job should be run

            this will grow and shrink but this is the initial setup for that
            
           */

          var counter = 0;
          var spawnjobs = [];
          for(var i=0; i<(job.attr('allocation') || 1); i++){
            spawnjobs.push({
              job:job,
              worker:staff.hire(job)
            })
          }

          async.forEachSeries(spawnjobs, function(spawnjob, nextspawnjob){
            self.allocate(spawnjob.job, spawnjob.worker, function(){
              process.nextTick(function(){
                nextspawnjob();
              })
            })
            
          }, function(){
            process.nextTick(function(){
              nextjob();
            })
          })

        }, function(){
          process.nextTick(function(){
            nextdepartment();
          })
        })
      }, done)
      
      
    },

    /*
    
      the main 'get stuff going' function

      this adds sparks to workers - they are remotely listening via their portals
      
    */
    allocate:function(job, worker, nextjob){
      var self = this;

      var spark = Container.new('spark', {
        name:job.title(),
        department:job.attr('department'),
        jobid:job.quarryid()
      })
      
      process.nextTick(function(){
        worker.append(spark)
        .title('Adding spark to job and worker: ' + job.summary() + ' -> ' + worker.summary())
        .ship(function(){
          nextjob();
        })  
      })
      

    }

  }, options)

  _.extend(planner, EventEmitter.prototype);

  return planner;
}