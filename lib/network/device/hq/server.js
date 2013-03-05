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
var Warehouse = require('../../../warehouse');
var Supplier = require('../../../supplier')
var Device = require('../../device');
var ContractResolver = require('../../../warehouse/resolvecontract');

module.exports = factory;

/*
  Quarry.io - HQ Server
  ------------------------------

  A mesh 

 */

function factory(options){

  function get_switchboard_options(direction){
    return {
      name:'hqswitchboard:' + direction,
      stackid:'hq',
      pub:{
        type:'pub',
        direction:direction,
        address:options.endpoints.pub
      },
      sub:{
        type:'sub',
        direction:direction,
        address:options.endpoints.sub
      }
    }
  }

  var switchboardserver = Device('switchboard.server', get_switchboard_options('bind'));
  var switchboardclient = Device('switchboard.client', get_switchboard_options('connect'));
  
  var server = Device('supplychain.server', {
    name:'hqsupplychainserver',
    stackid:'hq',
    switchboard:switchboardclient,
    socket:{
      type:'router',
      direction:'bind',
      address:options.endpoints.socket
    }
  })

  var warehouse = server.warehouse;

  var hq_supplychain = Device('hq.client', {
    name:'hqloopbackclient',
    stackid:'hq',
    endpoints:options.endpoints
  })

  /*
  
    the cache factory is used by providers
    
  */
  var cache = Device('cache.factory', options.servers.redis);

  /*
  
    this object is passed to all suppliers when running in network trim
    
  */
  var network = {
    hq:options,
    hq_supplychain:hq_supplychain,
    switchboard:switchboardclient,
    cache:cache,
    stack:{
      id:'hq'
    }
  }

  /*
  
    a place to keep things for the system

    this includes the HQ config and test stacks
    
  */
  var hq_database = Supplier('quarry.quarrydb', {
    id:'quarry.registry',
    module:'quarry.quarrydb',    
    reset:true
  }, network)

  /*
  
    the database used for running deployment stacks
    
  */
  var deployment_database = Supplier('quarry.provider', {
    id:'quarry.deployments',
    module:'quarry.quarrydb',
    autocreate:true,
    reset:true
  }, network) 

  /*
  
    this runs the stacks in development (i.e. IPC sockets)
    mode

    
  */
  var drone_server = Supplier('quarry.network.drone', {
    id:'quarry.drones',
    deployment:'/deployment'
  }, network)

  var resolver = ContractResolver(warehouse);

  warehouse.use(resolver);

  warehouse.mount('/hq', hq_database);
  warehouse.mount('/deployment', deployment_database);
  warehouse.mount('/drone', drone_server);
  
  return server;
}