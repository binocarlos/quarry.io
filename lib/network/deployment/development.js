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

var log = require('logule').init(module, 'Development Deployment');

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
  networkaddress:function(stack, service, type, instance){
    return 'ipc://' + runfolder + '/' + stack + ':' + service.replace(/\//g, '_') + ':' + type;
  },

  /*
  
    for the development network - each stack gets:

      1 x web worker
      1 x api worker
    
  */
  allocate:function(stack){
    
    console.log('-------------------------------------------');
    console.log('allocate stack');
    eyes.inspect(stack.toJSON());
  }

}