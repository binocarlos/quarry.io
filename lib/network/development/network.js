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
var singleton = require('./singleton');


/*
  Quarry.io - Development Deployment
  ----------------------------------

  All nodes run in the same process on a functional routed instance


 */

/*

  We only ever have one instance in a development stack



 */

var DevelopmentNetwork = module.exports = Base.extend({

  prepare:function(callback){
    Base.prototype.prepare.apply(this, [callback]);
  },

  // there is one single instance for a dev network
  load_instances:function(loaded){
    this.add_instance(new Instance({
      id:'development',
      hostname:'127.0.0.1'
    }))

    loaded();
  },

  // pile all the nodes onto the single instance
  allocate:function(loaded){
    var self = this;
    var development_instance = this.get_instance('development');

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

    var node = deployment.node();
    var allocation = deployment.allocation();

    var network = new Client(deployment.toJSON());

    var bootloader = new Bootloader({
      deployment:deployment,
      network:network
    })

    /*
    
      mount the pubsub message
      
    */
    self.emit('message', {
      text:'PUBSUB Deployment: ' + deployment.get('stack_id') + ' -> ' + deployment.get('allocation_id'),
      color:'yellow',
      depth:3,
      data:{
        stack_id:deployment.get('stack_id'),
        stack_path:deployment.get('allocation_id'),
        instance:deployment.get('instance')
      }
    })

    bootloader.pubsub(function(error, pubsub){

      if(error){
        loaded(error);
        return;  
      }
      
      /*
      
        assign the pubsub to the singleton for the client
        
      */
      singleton.pubsub(deployment.get('stack_id'), allocation.node_id, pubsub);

      loaded();
    })
  },

  // boot the code inline
  deploy_rpc:function(deployment, loaded){

    var self = this;

    var node = deployment.node();
    var allocation = deployment.allocation();

    var network = new Client(deployment.toJSON());

    var bootloader = new Bootloader({
      deployment:deployment,
      network:network
    })

    /*
    
      the main node message
      
    */
    self.emit('message', {
      text:'RPC Deployment: ' + deployment.get('stack_id') + ' -> ' + deployment.get('allocation_id'),
      color:'cyan',
      depth:3,
      data:{
        stack_id:deployment.get('stack_id'),
        stack_path:deployment.get('allocation_id'),
        instance:deployment.get('instance'),
        mounts:_.map(deployment.get('node.mountpaths'), function(mount){
          return mount.mountpoint;
        })
      }
    })

    /*
    
      the mount messages
      
    */
    _.each(_.map(deployment.get('node.mountpaths'), function(mount){
      return mount.mountpoint;
    }), function(mountpoint){
      self.emit('message', {
        text:'Mount: ' + mountpoint,
        color:'grey',
        depth:4
      })
    })

    bootloader.rpc(function(error, warehouse){

      if(error){
        loaded(error);
        return;  
      }
      

      /*
      
        here we assign the node to the singleton so we have easy access
        
      */
      singleton.rpc(deployment.get('stack_id'), allocation.node_id, warehouse);

      loaded();
    })
    
  },

  client_factory:function(data){
    return new Client(data);
  }
})