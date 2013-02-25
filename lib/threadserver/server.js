/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var utils = require('../utils');
var util = require('util');
var eyes = require('eyes');
var Warehouse = require('../warehouse');
var Container = require('../container');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var Threads = require('threads_a_gogo');
var fs = require('fs');
var JASON = require('JASON');

module.exports = ThreadServer;

/*
  Quarry.io - Map Thread Server
  -----------------------------

  Keeps a threads-a-go-go thread pool ready for injecting work into


 */

function ThreadServer(options){
  var self = this;
  options || (options = {});
  this.options = options;

  if(!this.options.supplychainclient){
    throw new Error('Thread Server requires a supplychainclient option');
  }

  this.supplychain = this.options.supplychainclient;
  this.system = this.options.system;

  var workerconfig = this.system.worker;
  
  this.callbacks = {};

  this.pool = Threads.createPool(10);
  
  this.pool.all.eval("JASON= "+ JASON.stringify(JASON));
  this.pool.load(__dirname + '/threadcode.js');

  this.pool.on('result', function(message){
    message = JASON.parse(message);
    
    var id = message.id;
    var callback = self.callbacks[id];

    if(!callback){
      return;
    }
    callback(message);
    delete(self.callbacks[id]);
  })
}

util.inherits(ThreadServer, EventEmitter);

ThreadServer.prototype.listen = function(callback){
  
  var self = this;
  
  callback();

}
/*

  add a function to the thread pool
  
*/
ThreadServer.prototype.run = function(stackpaths, fn_string, input, callback){

  var self = this;

  var id = utils.quarryid();

  var threadmessage = {
    id:id,
    stackpaths:stackpaths,
    fn_string:fn_string,
    input:input
  }

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('running map');
  eyes.inspect(threadmessage);

  this.callbacks[id] = function(message){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('map result');
    eyes.inspect(message);
    if(message.error){
      callback(message.error);
      return;
    }
    else{
      callback(null, message);
    }
  }

  self.pool.any.emit('map', JASON.stringify(threadmessage));
  
}