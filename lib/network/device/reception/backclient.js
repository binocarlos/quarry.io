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
var Warehouse = require('../../../warehouse');

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
  options.name || (options.name = 'reception_back_client');

  var department = options.department;
  var mapclient = options.mapclient;
  var switchboard = options.switchboard;
  var backclient = Device('core.box', {
    name:options.name
  })

  var warehouse = Warehouse();
  warehouse.switchboard = switchboard;
  warehouse.department = department;

  function handle(routingpacket, payload, callback){
    /*
    
      trigger the supply chain handler here
      
    */
    var req = Contract.request(payload);
    var res = Contract.response(function(){
      callback(res.toJSON());
    })
    
    res.setHeader('x-quarry-request-url', req.url);

    process.nextTick(function(){
      warehouse(req, res, function(){
        res.send404();
      })  
    })
    
  }

  var backclient = Device('core.box', {
    name:options.name,
    department:department
  })

  backclient.switchboard = switchboard;
  backclient.warehouse = warehouse;

  backclient.plugin = function(done){

    /*
    
      the current back socket connections to the Receptions
      
    */
    var pool = {};
    var intervalids = {};

    /*
    
      the current routing status that we broadcast to the reception
      servers every second
      
    */
    var routing_table = {};

    function addconnection(message){

      var receptionsocketid = message.endpoints.wireids.back;
      var socketaddress = message.endpoints.back;

      var backsocket = Device('core.wire', {
        type:'router',
        direction:'connect',
        manual:true,
        address:socketaddress
      })

      var thissocketid = backsocket.identity;
      warehouse._socketid = thissocketid;

      setTimeout(function(){
        intervalids[message.id] = setInterval(function(){
          var routes = JSON.stringify({
            timestamp:new Date().getTime(),
            department:department,
            routes:warehouse.get_mounts(thissocketid)
          })
          process.nextTick(function(){
            backsocket.send([receptionsocketid, 'routing_table', routes]);
          });
        }, 1000);  
      }, 500 + Math.round(Math.random()*500))

      backsocket.on('message', function(){
        var socketid = arguments[0];
        var request_id = arguments[1].toString();
        var routing_packet = arguments[2];
        var payload_packet = JSON.parse(arguments[3].toString());
        function respond(answer){
          backsocket.send([socketid, request_id, routing_packet, JSON.stringify(answer)]);
        }
        handle(routing_packet, payload_packet, respond);
      })

      process.nextTick(function(){
        backsocket.plugin();
      })
    }

    function removeconnection(message){
      var backsocket = pool[message.id];
      backsocket.close();
      clearInterval(intervalids[message.id]);
      delete(intervalids[message.id]);
      delete(pool[message.id]);
    }

    /*
    
      listen for any reception servers arriving and going

      treat them as a common pool

      wrap the callbacks from the rpc servers with the actual socket
      to write back down
      
    */
    mapclient.listen('reception');

    mapclient.on('add', addconnection);
    mapclient.on('remove', removeconnection);

    done();

  }

  backclient.mount = _.bind(warehouse.mount, warehouse);

  return backclient;
}