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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var _ = require('lodash');
var deck = require('deck');

var Device = require('../../device');
var SparkMonitor = require('../node/sparkmonitor');
var SocketCombo = require('./backsocketcombo');

module.exports = factory;
module.exports.closure = true;

function factory(options, callback){

  options || (options = {});

  var self = this;

  var db = options.db;

  var mainspark = null;

  var sparks = {};

  var monitor = SparkMonitor({
    db:db,
    selector:'workers.reception'
  })

  var socketcombo = SocketCombo({
    heartbeat:function(){
      return options.heartbeat;
    }
  })

  monitor.on('add', function(spark){

    sparks[spark.quarryid()] = spark;

    var endpoints = spark.attr('endpoints');

    var socket = Device.socket('router');

    socket.connect(endpoints.back);
    socketcombo.add(spark.quarryid(), socket);
  })

  monitor.on('remove', function(spark){
    
    delete(sparks[spark.quarryid()]);

    socketcombo.remove(spark.quarryid());

  })

  monitor.start(function(){
    callback(null, socketcombo);
  })
  
  return socketcombo;
}