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
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - Reception Server
  ----------------------------

  The main request router

  Listens to heartbeats from warehouses on the back socket

  The heartbeats tells the reception server what routes the stack has

  A route is:

  protocol        HTTP or Quarry
  department      Supplier / Code / Portal etc
  url             path to the stack resource

  Every request through a supplychain client will fill in a routing packet
  that contains this info about the larger (we don't want to JSON.parse it here) payload

 */

function factory(options){

  options || (options = {});
  options.name || (options.name = 'reception_server');

  var id = options.id;

  var server = Device('core.box', {
    name:options.name
  })

  server.plugin = function(done){

    var front = Device('core.wire', {
      type:'router',
      direction:'bind',
      address:options.front
    })

    var back = Device('core.wire', {
      type:'router',
      direction:'bind',
      address:options.back
    })

    front.on('message', function(){
      var args = _.toArray(arguments);
      process.nextTick(function(){

      })
    })


    back.on('message', function(){
      var args = _.toArray(arguments);
      var socketid = args[0].toString();
      var requestid = args[1].toString();

      process.nextTick(function(){
        /*
        
          this means the back-end server is letting us know what stack routes it provides
          
        */
        if(requestid=='routing_table'){

          var routing_table = JSON.parse(args[2].toString());

          console.log('-------------------------------------------');
          console.log('routing table: ' + id);
          eyes.inspect(routing_table);

        }
        /*
        
          this means the back-end server is responding to a request we have made
          
        */
        else{

        }
      })

    })

    server.wireids = {
      back:back.identity,
      front:front.identity
    }

    process.nextTick(function(){

      async.series([
        function(next){
          back.plugin(next);
        },

        function(next){
          front.plugin(next);
        }
      ], done)
    })
  }

  return server;
}