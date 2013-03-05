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
var EndpointFactory = require('./hq/endpointfactory');
var Slurper = require('./hq/stackslurper');
var defaultconfig = require('./hq/config');

var Device = require('./device');
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
    wrench.mkdirSyncRecursive(full);
  })
  defaultconfig.systemfolders = folders;

  this.endpointfactory = EndpointFactory(this.options.flavour, folders.run);

  return this;
}

/*

  prepare the core system resources (like the system switchboard and core database)
  
*/
HQ.prototype.boot = function(finished){

  var self = this;

  var merge = [{
      endpoints:{
        socket:this.endpointfactory.quarry(),
        pub:this.endpointfactory.quarry(),
        sub:this.endpointfactory.quarry()
      }
    }, 
    defaultconfig,
    defaultconfig.flavours[this.options.flavour],
    this.options
  ]

  var attr = _.extend.apply(_, merge);

  this.config = Container.new('systemconfig', attr);

  async.series([

    function(next){
      fs.writeFile(attr.systemhome + '/config.json', JSON.stringify(attr, null, 4), 'utf8', next);
    },

    function(next){
      self.server = Device('hq.server', self.config.attr());
      setTimeout(function(){
        next()
      }, 100)
    },

    function(next){
      self.client = Device('hq.client', self.config.attr());
      setTimeout(function(){
        next()
      }, 100)
    },

    function(next){

      self.client.upload_registry_config(self.config, next);

    }
  ], finished)
  
}

HQ.prototype.teststack = function(folder, ready){
  var self = this;

  Slurper(self.config.attr('stackfolders'), function(error, stacks){

    if(error){
      ready(error);
      return;
    }

    var stack = stacks[0];

    self.client.upload_test_project(stack, function(error){

      if(error){
        ready(error);
        return;
      }

      self.client.boot_drone(stack, function(error, drone){
        if(error){
          ready(error);
          return;
        }

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('drone booted');
        process.exit();
      })
    })    
  })
}