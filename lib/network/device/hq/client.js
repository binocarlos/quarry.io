/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;

var Container = require('../../../container');
var Warehouse = require('../../../warehouse');
var Supplier = require('../../../supplier')
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - HQ Server
  ------------------------------

  A mesh 

 */

function factory(options){

  function get_switchboard_options(direction){
    return 
  }

  var switchboardclient = Device('switchboard.client', {
    name:options.name,
    stackid:options.stackid,
    pub:{
      type:'pub',
      direction:'connect',
      address:options.endpoints.pub
    },
    sub:{
      type:'sub',
      direction:'connect',
      address:options.endpoints.sub
    }
  })

  var supplychain = Device('supplychain.client', {
    switchboard:switchboardclient,
    stackid:options.stackid,
    socket:{
      type:'dealer',
      direction:'connect',
      address:options.endpoints.socket
    }
  })

  /*
  
    a connection into the hq database
    
  */
  var hqdb = supplychain.connect('/hq');  

  /*

    make a folder for test projects to live
    
  */
  var projects = Container.new('projects', {
    name:'Test Projects'
  })

  supplychain.upload_registry_config = function(config, callback){

    /*
    
      add the configuration to the registry

      this means everything can read a global config if needed
      
    */
    hqdb.append([config, projects])
      .ship(function(){
        callback();
      })
  }

  supplychain.upload_test_project = function(stack, callback){

    projects.append(stack)
      .ship(function(body, res){
        callback(null, stack);
      })

  }

  supplychain.boot_drone = function(stack, callback){

    var droneserver = supplychain.connect('/drone/server');

    /*
    
      tell the droneserver to boot this project
      
    */
    droneserver.api({
      url:'/deploy',
      method:'post',
      body:{
        name:'Test Stack Drone',
        // this is the systempath to the stack we are uploading
        stackpath:stack.router().rpc()
      }
    }).ship(function(body, res){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.dir(body);
      console.log('-------------------------------------------');
      eyes.inspect(res.toJSON());
      process.exit();
      callback(res.hasError() ? res.getError() : null, res.body);
    })
      
  }

  return supplychain;
}