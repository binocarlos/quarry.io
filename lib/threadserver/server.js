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
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var Threads = require('threads_a_gogo');

module.exports = ThreadServer;

/*
  Quarry.io - Map Thread Server
  -----------------------------

  Keeps a threads-a-go-go thread pool ready for injecting work into


 */

function ThreadServer(options){
  options || (options = {});
  this.options = options;

  if(!this.options.supplychainclient){
    throw new Error('Thread Server requires a supplychainclient option');
  }

  this.supplychain = this.options.supplychainclient;

  /*
  
    a map of SHA1 hash onto fn wrapper for new job
    
  */
  this.workers = {};

  this.pool = Threads.createPool(10);
}

util.inherits(ThreadServer, EventEmitter);

/*

  add a function to the thread pool
  
*/
ThreadServer.prototype.run = function(fn_string, input, callback){
  var shasum = crypto.createHash('sha1');
  shasum.update(fn_string);
  var hash = shasum.digest('hex');

  if(this.workers[hash]){
    this.runworker(hash, input, callback);
  }
  else{
    this.prepareworker(hash, fn_string, function(error){
      self.runworker(hash, input, callback);
    })
  }
}

ThreadServer.prototype.prepareworker = function(hash, fn_string, callback){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('preapret');
  eyes.inspect(hash);
  eyes.inspect(fn_string);
  process.exit();

}