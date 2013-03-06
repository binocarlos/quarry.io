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


var utils = require('../../../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

/*

  Quarry.io - Job List
  --------------------

  Represents a compilation of a stacks services into the things
  that must be run by workers

  the job list is what's used as the source of the stack routing table

  it is effectively the backend of what the routers plug into

  the reception looks after what thing on the job list lives where

  a job list is basically a representation of the services in a stack
  but in the context of a live running deployment
  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Job List requires some options');
  }

  if(!options.stack){
    throw new Error('Job List requires a stack');
  }

  var stack = options.stack;

  var joblist = _.extend({
    container:stack.clone()
  }, options)

  _.extend(joblist, EventEmitter.prototype);

  return joblist;
}