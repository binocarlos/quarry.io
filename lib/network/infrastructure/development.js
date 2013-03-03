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

  quarry.io - development deployment

  boots all in one process and uses IPC for ZeroMQ addresses

 */

/*

  the folder where IPC socket files live
  
*/
var runfolder = '/tmp/quarrydeveloper/run';

module.exports = {

  prepare:function(callback){
    wrench.mkdirSyncRecursive(runfolder);
    callback();
  },

  /*

  we don't consume TCP sockets for a development network
    
  */
  rpcendpoint:function(stackid, servicename){
    /*
    
      we replace '/' with '_' so all the IPC files are in the same folder

      we always add a littid on the end to avoid multiple nodes with the same service name but
      on different workers
      
    */
    return 'ipc://' + runfolder + '/' + stackid.replace(/\//g, '_') + ':' + servicename.replace(/\//g, '_') + ':' + utils.littleid();
  },

  workerendpoint:function(worker, name, config){
    if(worker.hasClass('webserver') || config.type=='http'){
      return this.httpendpoint(worker);
    }
    else{
      return this.endpoint(worker.attr('stackid'), name);
    }
  },

  /*
  
    return instances for a stack

    the config decides if this is for boot or for breathing
    
  */
  allocate:function(config, callback){

    var stack = config.stack;

    /*
    
      dev infrastructure only returns localhost on boot and nothing after
      
    */
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

  /*
  
    this is called from the HQ
    
  */
  copystackcode:function(stack, workerconfig, callback){
    /*
    
      we do nothing here because we are in dev mode
      
    */
    callback();
  }


}