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

  server.middlewarestack = [];

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

  function runmiddleware(routing_packet, payload, done){
    if(server.middlewarestack.length<=0){
      done();
      return;
    }
    else{
      async.forEachSeries(server.middlewarestack, function(fn, nextfn){
        fn(routing_packet, payload, nextfn);
      }, done)
    }
  }

  var requests = {};

  front.on('message', function(){
    var args = _.toArray(arguments);
    var request = {};

    async.series([

      /*
      
        chunk down the request into the message parts
        
      */
      function(next){
        request.frontsocketid = args[0];
        request.frontrequestid = args[1];
        request.routing_packet_string = args[2].toString();
        request.routing_packet = JSON.parse(args[2].toString());
        request.payload = args[3];

        var department = request.routing_packet.department;
        var url = request.routing_packet.url;

        if(!department && request.routing_packet.contenttype=='quarry/contract'){
          department = 'contract';
        }

        if(url.indexOf('/')!=0){
          url = '/' + url;
        }

        request.route = department + ':' + url;

        next();
      },

      /*
      
        run the routing header and payload via the middleware
        
     
      function(next){
        runmiddleware(request.routing_packet, request.payload, function(error){
          if(error){
            front.send([request.frontsocketid, request.frontrequestid, request.routing_packet_string, JSON.stringify({
              statusCode:500,
              body:request.route + ': ' + error
            })])
          }
          else{
            next();
          }
        })
      },
       */
      /*
      
        route the request to the back end warehouses (if it made it through the middleware)
        
      */
      function(next){
        router(request.route, function(error, backsocketid){
          if(error || !backsocketid){
            server.emit('error', {
              error:error,
              route:request.route
            })
            front.send([request.frontsocketid, request.frontrequestid, request.routing_packet_string, JSON.stringify({
              statusCode:404,
              body:request.route + 'not found'
            })])
          }
          else{
            server.emit('route', {
              route:request.route,
              socket:backsocketid,
              routing_packet:request.routing_packet
            })
            var backrequestid = utils.quarryid();
            requests[backrequestid] = function(response_payload){

              process.nextTick(function(){
                front.send([request.frontsocketid, request.frontrequestid, request.routing_packet_string, response_payload]);
                delete(requests[backrequestid]);  
              })
              
            }

            back.send([backsocketid, backrequestid, request.routing_packet_string, request.payload]);
          }
        })
      }
    ])
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

  server.use = function(fn){
    server.middlewarestack.push(fn);
    return server;
  }

  return server;
}