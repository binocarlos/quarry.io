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

var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

var ProjectManager = require('../project/manager');

/*

  Quarry.io - Deployment Manager
  ------------------------------

  looks after the different styles of workforce (drone, local and cloud)

  It produces workers and boots them
  
*/


/*

  this is called AFTER both of the drone and business runners below

*/
function manager(options){

  var requiredoptions = [

    /*
    
      the name and id of the stack we are booting
      
    */
    'id',
    'name',

    /*
    
      the hq stackpath we are booting

      we will load the stack itself using this path
      
    */
    'stackpath',

    /*
    
      the network object passed to suppliers

        -> cache
        -> hq
        -> hq_warehouse
      
    */
    'network',

    /*
    
      the database provider for our deployments

      (this is a drone or business database)
      
    */
    'deployment_database_path',

    /*
    
      the function that knows how to provide the initial buildings
      and workers for our deployment
      
    */
    'hire_workforce',

    /*
    
      the function that knows how to get a worker booted onto a serer
      
    */
    'bootstrap_worker'
  ]

  _.each(requiredoptions, function(name){
    if(!options[name]){
      throw new Error('Stack runner requires a ' + name + ' option');
    }
  })

  return ProjectManager(options);
}

/*

  the drone stack runner will boot all of the workers
  into a standalone object
  
*/
module.exports.drone = function(options){

  if(!options){
    throw new Error('Stack runner:drone requires some options');
  }

  /*
  
    get a skeleton workforce of one building and part-time worker

    the drone server only needs these to start

    as more buildings and workers are added - they are fake copies
    of localhost

    this allows simulation of a big network all within a single drone

  */
  options.hire_workforce = function(){

    var testshed = Container.new('building', {
      name:'localhost',
      address:'127.0.0.1'
    }).addClass('drone')

    var droneworker = Container.new('worker', {
      name:'Part-time Worker'
    }).addClass('drone')

    testshed.append(droneworker);

    return testshed;
  }

  /*
  
    the function the knows how to start a worker in a building
    
  */
  options.bootstrap_worker = function(options, callback){

  }

  return manager(options);
}

/*

  the local stack runner will keep processes long running and detach
  but only use localhost as the servers
  
*/
module.exports.local = function(options){

  if(!options){
    throw new Error('Stack runner:business requires some options');
  }

  return manager(options);
}

/*

  the business stack runner will use Salt to grab servers and
  boot workers on those servers
  
*/
module.exports.business = function(options){

  if(!options){
    throw new Error('Stack runner:business requires some options');
  }

  return manager(options);
}