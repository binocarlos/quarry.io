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

var Workforce = require('./workforce');
var Map = require('./map');
var Planner = require('./planner');

/*

  Quarry.io - Project
  -------------------

  Represents running a stack

  This gets:

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
    'fixer'
  ]

  _.each(requiredoptions, function(name){
    if(!options[name]){
      throw new Error('Project Manager requires a ' + name + ' option');
    }
  })

  var network = options.network;
  var hq = network.hq;
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
  var deployment_database = options.network.hq_supplychain.connect(options.deployment_database_path);

  /*
  
    the fixer can hire a workforce and start workers
    
  */
  var fixer = options.fixer;

  var project = {
    map:null,
    planner:null,
    stack:null,
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

          /*
          
            get the stack written to the deployment database

            the we have it's jobs and tasks so we can append sparks
            to represent the deployment
            
          */
          hq_warehouse
            .load(projectpath + ':tree')
            .title('Deploying Stack: ' + projectid)
            .ship(function(stack){

              deployment_database
                .append(stack)
                .title('Appending stack to deployment database')
                .ship(function(){
                  project.stack = stack;
                  next();
                })
              
              
            })

        },

        function(next){

          /*
  
            this is a collection of buildings and workers to begin the stack
            
          */
          project.map = Map({
            id:projectid,
            database:deployment_database,
            stack:project.stack
          })
          .prepare(next);

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
            workerconfig:hq.workerconfig,
            janitorconfig:hq.janitorconfig,
            database:deployment_database
          })
          .on('hire_workforce', fixer.hire_workforce)
          .on('start_janitor', fixer.start_janitor)
          .on('start_worker', fixer.start_worker)
          .prepare(next);

        },

        function(next){
          /*
  
            this is a collection of buildings and workers to begin the stack
            
          */
          project.planner = Planner({
            id:projectid,
            map:project.map,
            workforce:project.workforce,
            stack:project.stack,
            database:deployment_database
          })
          .prepare(next);

        },

        function(next){

          /*
          
            this gets the workers booted
            
          */
          project.workforce.start_work(next);

          
          
        },

        function(next){

          /*
          
            this provides jobs for workers!
            
          */
          project.planner.begin(next);

          
        }

      ], function(error){
        if(error){
          done(error);
          return;
        }

        done(null, {
          id:projectid,
          booted:true
        })
      })
    }
  })

  _.extend(projectmanager, EventEmitter.prototype);

  return projectmanager;
}