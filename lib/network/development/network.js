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
    hostname:'development'
  }))

  loaded();
}

// pile all the nodes onto the single instance
DevelopmentNetwork.allocate_node_instances = function(loaded){
  var self = this;
  var development_instance = this.get_instance('development');

  _.each(self.stacks, function(stack){

    stack.recurse(function(node){
      self.allocate_node(stack, node, development_instance);
    })
  })

  loaded();
}

DevelopmentNetwork.allocate_system_instances = function(loaded){
  var self = this;
  var development_instance = this.get_instance('development');

  _.each(self.stacks, function(stack){
    self.allocate_system_node(stack, 'reception', development_instance);
    self.allocate_system_node(stack, 'switchboard', development_instance);
  })

  loaded();
}

DevelopmentNetwork.register_system = function(allocation, node){
  var map = this.systems[allocation.stack_id];
  if(!map){
    map = this.systems[allocation.stack_id] = {};
  }
  map[allocation.type] = node;
  return this;
}

DevelopmentNetwork.register_warehouse = function(allocation, warehouse){
  var map = this.warehouses[allocation.stack_id];
  if(!map){
    map = this.warehouses[allocation.stack_id] = {};
  }
  map[allocation.node_id] = warehouse;
  return this;
}

DevelopmentNetwork.get_bootloader_config = function(deployment){
  var self = this;

  // this is where to load the code to
  var instance = deployment.instance;

  // send the overview of the network
  var network_config = _.clone(this.toJSON());
  network_config.transport = 'local';

  var allocation = deployment.allocation;

  // get a linkage function to another part of the stack
  network_config.supplychain = this.supplychain(allocation.stack_id);
  network_config.reception = this.reception(allocation.stack_id);
  network_config.switchboard = this.switchboard(allocation.stack_id);

  // what is actually booted
  return {
    allocation:deployment.allocation,
    network:network_config,
    allocations:deployment.allocations
  }
}

// boot the code inline
DevelopmentNetwork.deploy_system = function(deployment, loaded){

  var self = this;

  var config = this.get_bootloader_config(deployment);

  config.type = deployment.allocation.type;

  this.register_system(deployment.allocation, Bootloader.system(config));
  
  loaded();

}

// boot the code inline
DevelopmentNetwork.deploy_node = function(deployment, loaded){

  var self = this;

  var config = this.get_bootloader_config(deployment);

  config.node = deployment.node.toJSON(true);
 
  this.register_warehouse(deployment.allocation, Bootloader.node(config));

  loaded();

}

DevelopmentNetwork.find_system = function(stack_id, type){
  var map = this.systems[stack_id];
  if(!map){
    return null;
  }
  return map[type];
}


DevelopmentNetwork.find_warehouse = function(stack_id, path){
  var map = this.warehouses[stack_id];
  if(!map){
    return null;
  }
  return map[path];
}





/*
  Produce a supply chain that points to a given node
 */
DevelopmentNetwork.supplychain = function(stack_id){
  var self = this;
  return function(path){
    return function(req, res, next){
      var map = self.warehouses[stack_id];

      if(!map){
        res.send404();
        return;
      }

      var handler = self.find_warehouse(stack_id, path);

      if(!handler){
        res.send404();
        return;
      }

      handler(req, res, next);
    }
  }
  
}

DevelopmentNetwork.switchboard = function(stack_id){
  var self = this;
  return function(){
    var switchboard = self.find_system(stack_id, 'switchboard');
    if(!switchboard){
      throw new Error('there must be a switchboard for the network!');
    }
    return switchboard;
  }
}

DevelopmentNetwork.reception = function(stack_id){
  var self = this;
  return function(){
    return function(req, res, next){
      var reception = self.find_system(stack_id, 'reception');
      if(!reception){
        throw new Error('there must be a reception for the network!');
      }
      reception.handle(req, res, next);
    }
  }
  
}