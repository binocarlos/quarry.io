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
  options.name || (options.name = 'reception_back_client');

  var mapclient = options.mapclient;
  
  /*
  
    the current back socket connections to the Receptions
    
  */
  var pool = {};

  function addconnection(message){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('ADDING RECEPTION CONNECTION');
    eyes.inspect(message);
    var back = Device('rpc.server', {
      type:'rpc.server',
      name:'BACK',
      socket:{
        type:'router',
        direction:'bind',
        address:message.endpoints.back
      }
    })

    pool[message.id] = back;
  }

  function removeconnection(message){
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

  var backclient = Device('core.box', {
    name:options.name
  })

  return backclient;
}