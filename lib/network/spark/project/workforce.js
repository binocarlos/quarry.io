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

  Quarry.io - Workforce
  ---------------------

  Looks after a collection of workers for a stack

  There are departments:

    reception       (fixed)
    switchboard     (fixed)

    router          (fixed but re-routable)
    warehouse

  Every workforce gets at least one of these

  The fixed workers do one job on the network

  The warehouse workers are the variable network element

  The routers the the breadboard of the network (the wires are real!)
  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Workforce requires some options');
  }

  /*
  
    hire workers is the initial provision of workers at the start
    
  */
  if(!_.isFunction(options.hire)){
    throw new Error('Workforce requires a hire function');
  }

  var container = Container.new('workforce').id(options.id);

  var workforce = _.extend({
    container:container,

    prepare:function(done){
      var initialstaff = options.hire();

      if(initialstaff.find('building').count()<=0){
        throw new Error('a workforce needs at least one building to operate');
      }

      if(initialstaff.find('worker').count()<=0){
        throw new Error('a workforce needs at least one worker to operate');
      }

      container.append(initialstaff);

      done();
      
      return this;
    }
  }, options)

  _.extend(workforce, EventEmitter.prototype);

  return workforce;
}