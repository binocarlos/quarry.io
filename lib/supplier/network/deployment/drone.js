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


var utils = require('../../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Warehouse = require('../../warehouse');
var Container = require('../../container');

var Workforce = require('./workforce');
var JobList = require('./joblist');
var Project = require('./project');
var Manager = require('./manager');

/*

  Quarry.io - Stack Runner
  ------------------------

  boots a workforce and a job list

  it passes both to a manager

  
*/


/*

  this is called AFTER both of the drone and business runners below

*/
function runner(options){

  /*
  
    the stack project we are running
    
  */
  if(!options.stack){
    throw new Error('Stack runner requires a stack option');
  }

  /*
  
    we should be provided with a workforce that knows how to grow/shrink
    
  */
  if(!options.workforce){
    throw new Error('Stack runner requires a workforce option');
  }

  /*
  
    the database to upload our jobs and workers
    
  */
  if(!options.database_provider){
    throw new Error('Stack runner requires a database_provider option');
  }

  var project = Project({
    stack:options.stack,
    workforce:options.workforce,
    database_provider:options.database_provider
  })

  return project;
}

/*

  the drone stack runner will boot all of the workers
  into a standalone object
  
*/
module.exports.drone = function(options){

  if(!options){
    throw new Error('Stack runner:drone requires some options');
  }

  options.workforce = Workforce({

    hire:function(container){

      var testshed = Container.new('building', {
        name:'localhost',
        address:'127.0.0.1'
      }).addClass('drone')

      var droneworker = Container.new('worker', {
        name:'Part-time Worker'
      }).addClass('drone')

      testshed.append(droneworker);

      container.append(testshed);
    },

    /*
    
      get a worker booted onto it's server
      
    */
    deploy_worker:function(building, worker, callback){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('worker');
      eyes.inspect(worker.toJSON());
      process.exit();
      
    }
  })

  return runner(options);
}

/*

  the local stack runner will keep processes long running and detach
  but only use localhost as the servers
  
*/
module.exports.local = function(options){

  if(!options){
    throw new Error('Stack runner:business requires some options');
  }

  options.workforce = Workforce({
    hire:function(container){
    },
    deploy_worker:function(){
    }
  })

  return runner(options);
}

/*

  the business stack runner will use Salt to grab servers and
  boot workers on those servers
  
*/
module.exports.business = function(options){

  if(!options){
    throw new Error('Stack runner:business requires some options');
  }

  options.workforce = Workforce({
    hire:function(container){
    },
    deploy_worker:function(){
    }
  })

  return runner(options);
}