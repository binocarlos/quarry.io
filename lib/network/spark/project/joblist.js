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
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Departments = require('../../../departments');
var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

/*

  Quarry.io - Job List
  --------------------

  Represents a compilation of a stacks services into the things
  that must be run by workers

  the job list is what's used as the source of the stack routing table

  it is effectively the backend of what the routers plug into

  the reception looks after what thing on the job list lives where

  a job list is basically a representation of the services in a stack
  but in the context of a live running deployment
  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Job List requires some options');
  }

  if(!options.id){
    throw new Error('Job List requires a id');
  }

  if(!options.stack){
    throw new Error('Job List requires a stack');
  }

  if(!options.database){
    throw new Error('Job List requires a database');
  }

  var stack = options.stack;
  var stackclone = stack.clone(true);
  var database = options.database;

  var joblist = _.extend({
    
    prepare:function(done){

      database
        .append(stackclone)
        .ship(function(){

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('after');
          eyes.inspect(stackclone.meta('quarrysupplier'));
          process.exit();

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log(JSON.stringify(options.stack.toJSON(), null, 4));

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log(JSON.stringify(stackclone.toJSON(), null, 4));
          var mergeappends = [];

          stack.find('department').each(function(department){

            console.log('-------------------------------------------');
            console.log('-------------------------------------------');
            console.log('checking department: ' + department.summary());
            /*
            
              make sure we have a 'core' job in each department
              (otherwise nothing will be booted)

              we can then assign workers to these core jobs
              to get the stack booted
              
            */
            if(department.find('job').count()<=0){
              var job = Container.new('job', {
                name:department.attr('name') + ' Core'
              }).addClass(department.attr('name')).addClass('core')

              mergeappends.push(department.append(job));
            }
          })

          /*
          
            we now have an array of append contracts (representing core
            jobs being added to departments)

            we can use the merge to get them done at the same time
            
          */
          stack.merge(mergeappends).ship(function(){
            console.log('-------------------------------------------');
            console.log('after appending the stack');
            eyes.inspect(stack.toJSON());
            done();
          })

        })
      
      return this;
    }

  }, options)

  _.extend(joblist, EventEmitter.prototype);

  return joblist;
}