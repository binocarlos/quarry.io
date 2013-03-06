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

var async = require('async');

var EventEmitter = require('events').EventEmitter;

var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

var JobList = require('./joblist');
var Manager = require('./manager');

/*

  Quarry.io - Project
  -------------------

  Represents running a stack

  This gets:

    joblist
    manager
    workforce


  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Project requires some options');
  }

  if(!options.stack){
    throw new Error('Project requires a stack');
  }

  if(!options.workforce){
    throw new Error('Project requires a workforce');
  }

  if(!options.database_provider){
    throw new Error('Project requires a database_provider');
  }

  var stack = options.stack;
  var drone_database_provider = options.database_provider;
  var droneid = options.id || utils.littleid();
  var database = options.database_provider.connect('/' + droneid);

  var workforce = options.workforce;
  /*
  
    the joblist looks after the stack stuff
    
  */
  var joblist = JobList({
    id:droneid,
    stack:options.stack
  })

  var projectmanager = _.extend({}, options, {
    id:droneid,
    joblist:joblist,
    workforce:workforce,
    boot:function(done){

      var self = this;

      async.series([
        function(next){

          database
            .append([joblist.container, workforce.container])
            .ship(function(){

              next();

            })
        },

        function(next){

          /*
          
            get the workers booted and ready
            
          */
          async.forEach(workforce.container.find('building').containers(), function(building, nextbuilding){

            async.forEach(building.find('worker').containers(), function(worker, nextworker){

              workforce.deploy_worker(building, worker, function(error){

                console.log('-------------------------------------------');
                console.log('-------------------------------------------');
                console.log('worker booted');
                process.exit();
                var radio = worker.radio();

              })
              
            }, nextbuilding)

          }, next)
          
        }

      ])
    }
  })

  _.extend(projectmanager, EventEmitter.prototype);

  return projectmanager;
}