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
var Device = require('../../device');

var ContractResolver = require('../../../warehouse/resolvercontract');

/*

  Quarry.io - Test Deployment
  ---------------------------

  Gets a stack built up with no HQ and static endpoints
  
*/
module.exports = function(hq, stack){

  if(!stack){
    throw new Error('test fixer requires a stack');
  }

  async.series([

    function(next){

      stuff.switchboardserver = Device('switchboard.server', {
        name:'teststackswitchboard server',
        stackid:'teststack',
        pub:{
          type:'pub',
          direction:'bind',
          address:hq.endpoints.pub
        },
        sub:{
          type:'sub',
          direction:'bind',
          address:hq.endpoints.sub
        }
      })

      stuff.switchboardserver.plugin(next);
    },

    function(next){

      stuff.switchboardclient = Device('switchboard.standardclient', {
        name:'teststackswitchboard client',
        stackid:'teststack',
        endpoints:{
          pub:hq.endpoints.pub,
          sub:hq.endpoints.sub
        }
      })
      stuff.switchboardclient.plugin(next);
    },

    function(next){

      var mainwarehouse = Warehouse();

      var resolver = ContractResolver(mainwarehouse);


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

  var stackdatabase = Supplier('quarry.quarrydb', {
    id:'teststack',
    reset:true
  })

  var db = Container.connect(stackdatabase);

  db.append([stack, map]).ship(function(){
    console.log('-------------------------------------------');
    console.log(JSON.stringify(stack.toJSON(), null, 4));
    process.exit();
  })

*/

  var fixer = {};

  fixer.run = function(done){
    console.log('-------------------------------------------');
    console.log('run');
  }

  _.extend(fixer, EventEmitter.prototype);

  return fixer;
}