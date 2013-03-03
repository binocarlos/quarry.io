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