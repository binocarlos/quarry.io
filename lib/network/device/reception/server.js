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
var deck = require('deck');

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

  var warehouse_routes = {};

  /*
  
    route is the protocol + path

      contract:/

      supplier:/db/1334
    
  */
  function router(route, callback){
    var matchedroutes = warehouse_routes[route];
    if(!matchedroutes){
      var parts = route.split('/');
      async.whilst(
        function(){
          return parts.length>0 && !matchedroutes;
        },
        function(next){
          parts.pop();
          matchedroutes = warehouse_routes[parts.join('/')];
          next();
        },
        function(){
          if(!matchedroutes || matchedroutes.length<=0){
            callback('no route');
            return;
          }
          callback(null, deck.pick(_.keys(matchedroutes)));
        }
      )
    }
    else{
      callback(null, deck.pick(_.keys(matchedroutes)));
    }
  }

  var requests = {};

  front.on('message', function(){
    var args = _.toArray(arguments);
    process.nextTick(function(){

      var frontsocketid = args[0];
      var requestid = args[1];
      var routing_packet_string = args[2].toString();
      var routing_packet = JSON.parse(args[2].toString());
      var packet = args[3];

      eyes.inspect(routing_packet);
      
      var route = (routing_packet.contenttype=='quarry/contract' ? 'contract' : (routing_packet.department || 'supplier')) + ':' + routing_packet.url;

      console.log('-------------------------------------------');
      console.log('routing');
      eyes.inspect(route);

      router(route, function(error, backsocketid){

        console.log('-------------------------------------------');
        eyes.inspect(error);
        eyes.inspect(backsocketid);
        
        if(error || !backsocketid){
          front.send([frontsocketid, requestid, routing_packet, JSON.stringify({
            statusCode:404,
            body:route + 'not found'
          })])
        }
        else{
          var requestid = utils.quarryid();
          requests[requestid] = function(payload){
            console.log('-------------------------------------------');
            console.log('-------------------------------------------');
            console.log('RES FROM BACK');
            eyes.inspect(payload);

            front.send([frontsocketid, requestid, routing_packet_string, payload]);
            delete(requests[requestid]);
          }

          back.send([backsocketid, requestid, routing_packet_string, packet]);
        }
      })
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

        /*
        
          TODO - pay attention to the timestamp and determine that
          a route is not there if the timestamp does not line up

          presently sockets that go away
          
        */
        var routing_table = JSON.parse(args[2].toString());

        _.each(routing_table.routes, function(socketid, route){
          var map = warehouse_routes[route] || {};
          map[socketid] = true;
          warehouse_routes[route] = map;
        })

      }
      /*
      
        this means the back-end server is responding to a request we have made
        
      */
      else{
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        eyes.inspect('BACK');
        process.exit();
        var fn = requests[requestid];

        fn && fn(args[3]);
      }
    })

  })

  server.wireids = {
    back:back.identity,
    front:front.identity
  }

  server.plugin = function(done){

    async.series([
      function(next){
        back.plugin(next);
      },

      function(next){
        front.plugin(next);
      }
    ], done)
  }

  return server;
}