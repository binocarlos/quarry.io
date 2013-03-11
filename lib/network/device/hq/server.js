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
var fs = require('fs');

module.exports = factory;

/*
  Quarry.io - HQ Server
  ------------------------------

  A mesh 

 */

function factory(options, callback){

  fs.writeFileSync(options.systemfolders.deployment + '/hqserver.json', JSON.stringify(options, null, 4), 'utf8');

  var hqserver = Device('core.box', {

  })
  
  hqserver.plugin = function(done){
    var stack = {};

    async.series([

      /*
      
        first get the switchboard server up and running
        
      */
      function(next){

        stack.switchboardserver = Device('switchboard.server', {
          name:'hqswitchboard server',
          stackid:'hq',
          pub:{
            type:'pub',
            direction:'bind',
            address:options.endpoints.pub
          },
          sub:{
            type:'sub',
            direction:'bind',
            address:options.endpoints.sub
          }
        })

        stack.switchboardserver.plugin(next);
      },

      function(next){

        stack.switchboardclient = Device('switchboard.standardclient', options);
        stack.switchboardclient.plugin(next);
      },

      function(next){

        var rpcserver = Device('rpc.server', {
          type:'router',
          direction:'bind',
          address:options.endpoints.socket
        })

        stack.warehouse = Device('supplychain.server', {
          name:'hqsupplychainserver',
          stackid:'hq',
          switchboard:stack.switchboardclient,
          socket:Device('json.server', {
            socket:rpcserver
          })
        })

        rpcserver.plugin(next);
      },

      function(next){

        stack.hq_supplychain = Device('hq.client', {
          name:'hqloopbackclient',
          stackid:'hq',
          endpoints:options.endpoints
        })

        stack.hq_supplychain.plugin(next);
      },

      function(next){

        /*
    
          the cache factory is used by providers
          
        */
        var cache = Device('cache.factory', options.servers.redis);

        /*
        
          this object is passed to all suppliers when running in network trim
          
        */
        var network = {
          hq:options,
          hq_supplychain:stack.hq_supplychain,
          hq_warehouse:stack.hq_supplychain.connect('/hq'),
          switchboard:stack.switchboardclient,
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
        
          the database used for running drone stacks
          
        */
        var drone_database = Supplier('quarry.provider', {
          id:'quarry.drones',
          module:'quarry.quarrydb',
          autocreate:true,
          reset:true
        }, network)

        /*
        
          this runs the stacks in development (i.e. IPC sockets)
          mode

          
        */
        var drone_server = Supplier('quarry.network.droneserver', {
          id:'quarry.drones',
          deployment_database_path:'/drone/database'
        }, network)

        var warehouse = stack.warehouse;
        var resolver = ContractResolver(warehouse);

        warehouse.use(resolver);

        warehouse.mount('/hq', hq_database);
        warehouse.mount('/drone/database', drone_database);
        warehouse.mount('/drone/server', drone_server);

        next();
      }

    ], done)
  }

  return hqserver;
}