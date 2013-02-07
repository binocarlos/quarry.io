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
var baseconfig = require('../../../config.json');
var wrench = require('wrench');
var Worker = require('../worker');
var log = require('logule').init(module, 'Development infrastructure');
var SupplyChain = require('../supplychain');
var utils = require('../../utils');

/*

  quarry.io - development deployment

  boots all in one process and uses IPC for ZeroMQ addresses

 */

var runfolder = '/tmp/quarrydeveloper/run';

module.exports = {

  prepare:function(callback){
    log.info('creating run folder: ' + runfolder);
    wrench.mkdirSyncRecursive(runfolder);
    callback();
  },

  /*

  we don't consume TCP sockets for a development network
    
  */
  endpoint:function(stackid, servicename){
    /*
    
      we replace '/' with '_' so all the IPC files are in the same folder

      we always add a littid on the end to avoid multiple nodes with the same service name but
      on different workers
      
    */
    return 'ipc://' + runfolder + '/' + stackid.replace(/\//g, '_') + ':' + servicename.replace(/\//g, '_') + ':' + utils.littleid();
  },

  get_system_endpoints:function(){

    return {
      rpc:this.endpoint('system', 'rpc'),
      pub:this.endpoint('system', 'pub'),
      sub:this.endpoint('system', 'sub')
    }
  },

  /*
  
    in development mode we give localhost to each stack
    
  */
  allocate_instances:function(stack, callback){

    log.info('allocating');

    callback(null, {
      core:this.db.find('#localhost'),
      api:this.db.find('#localhost'),
      web:this.db.find('#localhost')
    })

  },

  deploy_worker:function(stack, worker, callback){

    log.info('deploy_worker');

    SupplyChain('system', '/database').connect(function(db){
      db('test').ship(function(){
        console.log('-------------------------------------------');

        process.exit();
      })
    })
    /*

    var bootconfig = {
      stackid:stack.id,
      workerid:worker.quarryid()
    }

    var worker = new Worker();

    worker.boot(bootconfig, callback);
    */
  }

}