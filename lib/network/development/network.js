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

var singleton = require('./singleton');


/*
  Quarry.io - Development Deployment
  ----------------------------------

  All nodes run in the same process on a functional routed instance


 */

/*

  We only ever have one instance in a development stack



 */

var DevelopmentNetwork = module.exports = {};

DevelopmentNetwork.prepare = function(callback){
  this.warehouses = {};
  this.systems = {};
  
  callback && callback();
}

// there is one single instance for a dev network
DevelopmentNetwork.load_instances = function(loaded){
  this.add_instance(new Instance({
    id:'development',
    hostname:'127.0.0.1'
  }))

  loaded();
}

// pile all the nodes onto the single instance
DevelopmentNetwork.allocate = function(loaded){
  var self = this;
  var development_instance = this.get_instance('development');

  _.each(self.stacks, function(stack){

    stack.recurse(function(node){
      self.allocate_node(stack, node, development_instance);
    })
  })

  loaded();
}

DevelopmentNetwork.register_warehouse = function(allocation, warehouse){
  var map = this.warehouses[allocation.stack_id];
  if(!map){
    map = this.warehouses[allocation.stack_id] = {};
  }
  map[allocation.node_id] = warehouse;
  return this;
}

// boot the code inline
DevelopmentNetwork.deploy_pubsub = function(deployment, loaded){

  var self = this;

  var node = deployment.node();
  var allocation = deployment.allocation();

  var runner = node.load();

  console.log('-------------------------------------------');
  console.log('deploying PUBSUB: ' + deployment.get('stack_id'));
  eyes.inspect(allocation);

  singleton.pubsub(deployment.get('stack_id'), allocation.node_id, runner);

  loaded();

}

// boot the code inline
DevelopmentNetwork.deploy_rpc = function(deployment, loaded){

  var self = this;

  var node = deployment.node();
  var allocation = deployment.allocation();

  var switchboard = singleton.pubsub(deployment.get('stack_id'), '/reception/switchboard/');

  if(!switchboard){
    throw new Error('No switchboard found for: ' + deployment.get('stack_id'));
  }

  console.log('-------------------------------------------');
  console.log('deploying RPC: ' + deployment.get('stack_id'));
  eyes.inspect(allocation);

  var warehouse = Bootloader({
    deployment:deployment,
    switchboard:switchboard,
    supplychain:function(path){
      return function(req, res, next){
        var server = singleton.rpc(deployment.get('stack_id'), path);

        if(!server){
          res.send404();
          return;
        }

        server(req, res, next);
      }
    }
  })

  singleton.rpc(deployment.get('stack_id'), allocation.node_id, warehouse);

  loaded();

}

DevelopmentNetwork.entrypoint = function(hostname){
  return singleton.rpc(hostname, '/reception/');
}