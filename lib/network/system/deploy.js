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
var Container = require('../../container');
var eyes = require('eyes');
var os = require('os');
var wrench = require('wrench');
var utils = require('../../utils');
var Worker = require('../worker/proto');
var async = require('async');
var Node = require('../node');
/*

  quarry.io - stack deploy

  knows how to get worker processes for the situation on the go

 

  allocate:function(config, callback){

    var stack = config.stack;


    var instances = config.bootmode ? this.db.find('#localhost') : this.db.spawn([]);
    
    callback(null, instances);
  },

  networkdeploy:function(flavour, callback){
    var self = this;

    var worker = null;

    async.series([

      function(next){
        
        worker = Node({
          flavour:flavour,
          system:self.system
        })

        worker.boot(next);

      }


    ], callback);
  },

  deploy:function(stack, bootconfig, callback){

    var self = this;

    var worker = null;

    async.series([

      function(next){
        
        bootconfig.system = self.system;
        bootconfig.stack = stack.config;

        worker = new Worker(bootconfig);

        worker.boot(next);

      }


    ], callback);
    
    
  },

*/  