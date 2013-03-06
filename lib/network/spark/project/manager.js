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
var Workforce = require('./workforce');

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

  var requiredoptions = [
    'id',
    'name',
    'stackpath',
    'network',
    'deployment_database_path',

    /*
    
      these are filled in by the deployment manager
      
    */
    'hire_workforce',
    'bootstrap_worker'
  ]

  _.each(requiredoptions, function(name){
    if(!options[name]){
      throw new Error('Project Manager requires a ' + name + ' option');
    }
  })

  var hq_warehouse = options.network.hq_warehouse;

  /*
  
    the id of the active stack (project)
    
  */
  var projectid = options.id || utils.littleid();
  var projectname = options.name;
  var projectpath = options.stackpath;

  /*
  
    this is where our booted project is living within the hq stack
    
  */
  var deployment_database = options.network.hq_supplychain.connect(options.deployment_database_path + '/' + projectid);

  var project = {
    stack:null,
    joblist:null,
    workforce:null
  }

  /*
  
    the dude that ties it all together
    
  */
  var projectmanager = _.extend({}, options, {
    id:projectid,
    name:projectname,
    path:projectpath,
    boot:function(done){

      var self = this;

      async.series([


        /*
        
          first lets load up the stack from the HQ database
          
        */
        function(next){

          hq_warehouse.load(projectpath + ':tree', function(stack){
            project.stack = stack;
            next();
          })

        },

        /*
        
          now create a workforce and joblist from the stack
          
        */

        function(next){
          /*
  
            this is a collection of buildings and workers to begin the stack
            
          */
          project.workforce = Workforce({
            id:projectid,
            hire:options.hire_workforce
          }).prepare(next);

        },

        function(next){
          /*
  
            this is a collection of departments and jobs that we need to
            give workers to in order to deploy the stack

              idea + GUI:     Workers -> JobList

              reality:        Jobs -> Workers

            The user will assign workers to do jobs - this lets the user easily
            give multiple jobs to the same worker or multiple workers to one job

            Underneath what is happening is as workers are assigned to jobs,
            the job is added to the worker as a spark in the database

            The worker processes are remotely listening for sparks via their portal
            and manage the running sparks themselves

            For network topology reporting - you can ask all workers what sparks they
            are running

            A spark will explicitly name the other end of it's connection and so a
            network wiring diagram can be built
            
          */
          project.joblist = JobList({
            id:projectid,
            stack:project.stack,
            database:deployment_database
          }).prepare(next);

        },

        function(next){

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          process.exit();
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