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
var wrench = require('wrench');
var eyes = require('eyes');
var _ = require('lodash');
var async = require('async');
var extend = require('xtend');
var fs = require('fs');
var Container = require('../container');
var EndpointFactory = require('./tools/endpointfactory');
var Slurper = require('./tools/stackslurper');
var defaultconfig = require('./tools/config');

var Device = require('./device');
var TestBooter = require('./tools/testbooter');

/*

  quarry.io - system proto

  the core quasi-stack used by the rest of the stacks like a mothership of greatness if you like
  
*/

module.exports = HQ;

function HQ(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(HQ, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
HQ.prototype.initialize = function(options, callback){
  
  this.options = options;

  /*
  
    setup the system folders
    
  */
  var folders = {};
  _.each(defaultconfig.systemfolders, function(folder){
    var full = defaultconfig.systemhome + '/' + folder;
    folders[folder] = full;
    wrench.rmdirSyncRecursive(full, true);
    wrench.mkdirSyncRecursive(full);
  })
  defaultconfig.systemfolders = folders;

  this.endpointfactory = EndpointFactory(this.options.flavour, folders.run);

  return this;
}

HQ.prototype.makeconfig = function(extra){
  return Container.new('hq', _.extend.apply(_, [
    defaultconfig,
    defaultconfig.flavours[this.options.flavour],
    this.options,
    extra
  ]));
}

HQ.prototype.teststack = function(folder, ready){
  var self = this;

  if(!fs.existsSync(folder)){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log(folder + ' does not exist');
    process.exit();
  }

  var systemconfig = this.makeconfig({
    endpoints:{
      pub:this.endpointfactory.quarry(),
      sub:this.endpointfactory.quarry()  
    }
  })

  Slurper(systemconfig.attr('stackfolders'), function(error, stacks){

    if(error){
      ready(error);
      return;
    }

    var stack = stacks[0];
    stack.append(systemconfig);

    var booter = TestBooter(stack);

    booter.start(function(){
      console.log('-------------------------------------------');
      console.log('booter done');
    })
  })
}