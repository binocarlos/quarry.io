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


/*
  Quarry.io - Local Deployment
  ----------------------------

  A single server deployment with each node running in it's own process but all on one server

  This uses Axon as it's transport layer


 */

/*

  We only ever have one instance in a development stack



 */

var LocalNetwork = module.exports = {};

LocalNetwork.prepare = function(callback){
  callback && callback();
}

// there is one single instance for a dev network
LocalNetwork.load_instances = function(loaded){
  this.add_instance(new Instance({
    id:'localhost',
    hostname:'127.0.0.1'
  }))

  loaded();
}

// pile all the nodes onto the single instance
LocalNetwork.allocate = function(loaded){
  var self = this;
  var development_instance = this.get_instance('localhost');

  _.each(self.stacks, function(stack){

    stack.recurse(function(node){
      self.allocate_node(stack, node, development_instance);
    })
  })

  loaded();
}

// boot the code inline
LocalNetwork.deploy_pubsub = function(deployment, loaded){

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
LocalNetwork.deploy_rpc = function(deployment, loaded){

  var self = this;

  var node = deployment.node();
  var allocation = deployment.allocation();

  var network = new Client(deployment.toJSON());

  var switchboard = singleton.pubsub(deployment.get('stack_id'), '/reception/switchboard/');

  if(!switchboard){
    throw new Error('No switchboard found for: ' + deployment.get('stack_id'));
  }

  console.log('-------------------------------------------');
  console.log('deploying RPC: ' + deployment.get('stack_id'));
  eyes.inspect(allocation);

  var warehouse = Bootloader({
    deployment:deployment,
    network:network,
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

LocalNetwork.client_factory = function(data){
  return new Client(data);
}