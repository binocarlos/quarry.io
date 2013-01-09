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

var _ = require('underscore');
var async = require('async');
var eyes = require('eyes');
var Instance = require('../instance');
var Bootloader = require('../bootloader');
var Node = require('../../stack/node');
var Client = require('./client');
var Base = require('../proto');
var fs = require('fs');
var wrench = require('wrench');

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

/*
  Quarry.io - Development Deployment
  ----------------------------------

  All nodes run in the same process on a functional routed instance


 */

/*

  We only ever have one instance in a development stack



 */

var LocalNetwork = module.exports = Base.extend({

  initialize:function(){
    Base.prototype.initialize.apply(this, []);

    /*
    
      keep track of the processes we will run inside of mongroup
      
    */
    this.mongroup = [];
  },

  ensure_folders:function(callback){

    wrench.mkdirSyncRecursive(this.get('folder'), 0777);

    wrench.mkdirSyncRecursive(this.get('folder')+'/build', 0777);
    wrench.mkdirSyncRecursive(this.get('folder')+'/build/pids', 0777);
    wrench.mkdirSyncRecursive(this.get('folder')+'/build/logs', 0777);


    wrench.mkdirSyncRecursive(this.get('folder')+'/stacks', 0777);

    wrench.mkdirSyncRecursive(this.get('folder')+'/resources', 0777);
    wrench.mkdirSyncRecursive(this.get('folder')+'/resources/files', 0777);

    callback && callback();
  },

  isrunning:function(){
    return fs.existsSync(this.get('folder')+'/build');
  },

  /*
  
    create the folder that the build for a stack will live in
    
  */
  ensure_stack_folder:function(stack_id){
    if(fs.existsSync(this.get('folder')+'/build/' + stack_id)){
      return;
    }

    wrench.mkdirSyncRecursive(this.get('folder')+'/build/' + stack_id, 0777);
    
    wrench.mkdirSyncRecursive(this.get('folder')+'/build/' + stack_id + '/deployments', 0777);
  },

  is_running:function(){
    return fs.existsSync(this.pid_file());
  },

  pid_file:function(){
    return this.get('folder')+'/build/network.pid';
  },

  load:function(callback){
    var self = this;
    if(this.is_running()){
      self.emit('error', 'Network is already running', true);
      return;
    }
    Base.prototype.load.apply(this, [callback]);
  },

  // there is one single instance for a dev network
  load_instances:function(loaded){
    this.add_instance(new Instance({
      id:'local',
      hostname:'127.0.0.1'
    }))

    loaded();
  },

  // pile all the nodes onto the single instance
  allocate:function(loaded){
    var self = this;
    var development_instance = this.get_instance('local');

    self.allocate_gateway(development_instance);
    
    _.each(self.stacks, function(stack){

      self.emit('message', {
        text:'Allocate Stack: ' + stack.id,
        color:'red',
        depth:3
      })
      stack.recurse(function(node){
        self.allocate_node(stack, node, development_instance);
      })
    })

    loaded();
  },

  // boot the code inline
  deploy_pubsub:function(deployment, loaded){

    var self = this;

    /*
  
      outputs the JSON for a deployment into the network/deployment folder
      
    */
    deployment.save();

    this.mongroup.push({
      type:'pubsub',
      name:deployment.processname(),
      deployment:deployment.savepath()
    })

    self.pubsub_message(deployment);

    loaded();

  },

  // boot the code inline
  deploy_rpc:function(deployment, loaded){

    var self = this;

    /*
  
      outputs the JSON for a deployment into the network/deployment folder
      
    */
    deployment.save();

    this.mongroup.push({
      type:'rpc',
      name:deployment.processname(),
      deployment:deployment.savepath()
    })

    self.rpc_message(deployment);

    loaded();
    
  },

   // boot the code inline
  deploy_gateway:function(loaded){

    var self = this;

    var gateway_config = {
      ports:this.get('ports'),
      clients:{}
    }

    _.each(_.keys(this.allocations), function(stack_id){
      gateway_config.clients[stack_id] = self.get_client_config(stack_id);
    })

    fs.writeFileSync(this.get('folder')+'/build/gateway.json', JSON.stringify(gateway_config, null, 4), 'utf8');

    loaded && loaded();
    
  },


  mongroup_file:function(){
    return this.get('folder') + '/build/mongroup.conf';
  },

  post_booted:function(callback){
    var booter = __dirname + '/booter.js';

    /*
    
      first setup the mongroup file
      
    */
    var monstrings = _.map(this.mongroup, function(process){
      return process.name + ' = node ' + booter + ' start --type=' + process.type + ' --deployment=' + process.deployment;
    })

    var monlines = ([
      'gateway = node ' + booter + ' gateway --deployment=' + (this.get('folder')+'/build/gateway.json'),
      'pids = ' + this.get('folder') + '/build/pids',
      'logs = ' + this.get('folder') + '/build/logs',
      'on-error = ' + __dirname + '/logger.js error',
      'on-restart = ' + __dirname + '/logger.js restart'
    ]).concat(monstrings).concat([''])

    var mongrouptext = monlines.join("\n");

    fs.writeFileSync(this.mongroup_file(), mongrouptext, 'utf8');

    /*
    
      now lets kick off the mongroup and log
      
    */

    exec('mongroup --config ' + this.mongroup_file() + ' start',
      function (error, stdout, stderr) {
        if(!error){
          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('network started');
          console.log(stdout);  
        }
        
        callback && callback(error, stdout);
    })
    
  },

  stop:function(callback){
    var self = this;
    exec('mongroup --config ' + this.mongroup_file() + ' stop',
      function (error, stdout, stderr) {
        wrench.rmdirSyncRecursive(self.get('folder')+'/build', true);
        callback && callback(error, stdout);
    })
  },

  status:function(callback){

    exec('mongroup --config ' + this.mongroup_file() + ' status',
      function (error, stdout, stderr) {
        console.log('-------------------------------------------');
        console.log('network status');
        console.log('-------------------------------------------');
        console.log(stdout);

        callback && callback(error, stdout);
    })
  },

  debug:function(callback){
    // Child will use parent's stdios
    spawn('mongroup', [
      '--config',
      this.mongroup_file(),
      'logf'
    ], { stdio: 'inherit' })
  },

  client_factory:function(data){
    return new Client(data);
  }
})