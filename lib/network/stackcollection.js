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
var utils = require('../utils');
var eyes = require('eyes');
var _ = require('lodash');
var Container = require('../container');
var async = require('async');
var jsonloader = require('../tools/jsonloader');
var fs = require('fs');
var wrench = require('wrench');

var Node = require('./node');
var Device = require('./device');
var StackSlurper = require('./stack/slurper');

/*

  quarry.io - stack container

  looks after running all of the stacks on one network

  
*/

module.exports = StackCollection;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function StackCollection(systemconfig){
  EventEmitter.call(this);
  this.systemconfig = systemconfig;
  this.stacks = {};
}

util.inherits(StackCollection, EventEmitter);

StackCollection.prototype.prepare = function(callback){
  var self = this;

  async.series([

    /*
    
      get the stacks loaded in
      
    */
    function(next){
      self.slurp_stacks(next);
    }

  ], callback)

}

/*

   build all of the stacks the network found in folders
  
*/
StackCollection.prototype.slurp_stacks = function(callback){

  var self = this;

  /*
  
    these are the stacks slupred in from the folder structure
    of the network - they will added to the database once it's
    up and running
    
  */

  async.forEachSeries(this.systemconfig.attr('slurpfolders') || [], function(stackfolder, next_stack){

    StackSlurper(stackfolder, function(error, stack){
      if(!stack){
        console.log('stack: ' + stackfolder + ' failed to load');
        process.exit();
        next_stack();
      }

      self.stacks[stack.id()] = stack;

      next_stack();
    })

  }, callback)
}