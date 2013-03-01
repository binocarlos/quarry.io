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
var deck = require('deck');
var JASON = require('JASON');
var Contract = require('../contract');

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

  if(!this.options.supplychain){
    throw new Error('Thread Server requires a supplychainclient option');
  }

  if(!this.options.codefolder){
    throw new Error('Thread Server requires a codefolder option');
  }


  this.codefolder = this.options.codefolder;
  this.supplychain = this.options.supplychain;
  
  this.callbacks = {};

  /*
  
    threads by their id
    
  */
  this.pool = [];

  for(var i=0; i<10; i++){
    this.createthread();
  }
}

util.inherits(ThreadServer, EventEmitter);

ThreadServer.prototype.createthread = function(){
  var self = this;
  
  var thread = Threads.create();
  var threadid = utils.quarryid();

  thread.eval("JASON= "+ JASON.stringify(JASON));
  thread.load(this.codefolder + '/core/browser.js');
  thread.load(__dirname + '/threadcode.js');
  thread.eval('$quarryid = "' + threadid + '";');

  thread.on('log', function(st){
    console.log('-------------------------------------------');
    console.log('thread log');
    console.log(st);
  })

  thread.on('error', function(e){
    console.log('-------------------------------------------');
    console.log('thread error');
    console.log(e);
  })
  
  thread.on('request', function(message){

    message = JASON.parse(message);

    self.supplychain.rpc(message.req, function(packet){
    
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('run response');
      
      thread.emit('response', JASON.stringify({
        id:message.id,
        res:packet
      }))
    })

  })

  thread.on('result', function(message){
    message = JASON.parse(message);
    
    var id = message.id;
    var callback = self.callbacks[id];

    if(!callback){
      return;
    }
    callback(message);
    delete(self.callbacks[id]);
  })

  this.pool.push(thread);
}

ThreadServer.prototype.listen = function(callback){
  
  var self = this;
  
  callback();

}

ThreadServer.prototype.run = function(method, packet, callback){
  var self = this;
  this.callbacks[packet.id] = function(message){

    if(message.error){
      callback(message.error);
      return;
    }
    else{
      callback(null, message);
    }
  }

  var thread = deck.pick(self.pool);
  thread.emit(method, JASON.stringify(packet));
}

/*

  add a function to the thread pool
  
*/
ThreadServer.prototype.map = function(options, callback){
  var self = this;

  var packet = _.extend({}, options, {
    id:utils.quarryid(),
    projectroutes:options.projectroutes,
    fn:options.fn,
    input:options.input
  })

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log(JSON.stringify(packet, null, 4));

  this.run('map', packet, callback);
}

/*

  add a function to the thread pool
  
*/
ThreadServer.prototype.script = function(options, callback){
  var self = this;

  var packet = _.extend({}, options, {
    id:utils.quarryid(),
    projectroutes:options.projectroutes,
    fn:options.fn,
    req:options.req
  })

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log(JSON.stringify(packet, null, 4));

  this.run('script', packet, callback);
}
