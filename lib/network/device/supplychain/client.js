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
var Container = require('../../../container');
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - SupplyChain Server
  ------------------------------
 

 */

function factory(options){

  options || (options = {});
  options.name || (options.name = 'supplychain_client');

  if(!options.switchboard){
    throw new Error('the supplychain client wants a switchboard');
  }

  var deviceconfig = {
    socket:{
      type:'json.client',
      socket:options.socket
    }
  }

  if(options.http){
    devices.http = {
      type:'http.client',
      http:options.http
    }
  }

  var client = Device('core.box', {
    name:options.name,
    devices:deviceconfig
  })

  var socket = client.devices.socket;
  var switchboard = options.switchboard;

  function supplychain(req, res, next){

    req.setHeader('x-quarry-stackid', options.stackid);
    socket.send(req.routingpacket(), req.toJSON(), function(answer){
      res.fill(answer);
    })

  }

  supplychain.switchboard = switchboard;

  supplychain.connect = function(stackpath){
    var container = Container.new('supplychain', {
      name:'Supply Chain -> ' + (stackpath || '/')
    }).meta({
      supplychainroot:true,
      quarrysupplier:stackpath ? stackpath : '/'
    })
    container.supplychain = supplychain;

    container.connect = function(appendpath){
      return supplychain.connect((stackpath + appendpath).replace(/\/\//g, '/'));
    }
    
    return container;
  }

  return supplychain;
}