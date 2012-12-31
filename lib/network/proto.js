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
var utils = require('../utils');
var eyes = require('eyes');
var serverutils = require('../server/utils');
var Instance = require('./instance');
var StackFactory = require('../stack');
var Warehouse = require('../warehouse');
var Deployment = require('./deployment');
var Client = require('./client');
var Network = module.exports = {};


/*
  Quarry.io - Network
  -------------------

  Manage how a single stack is bootloaded onto the network

  The overall infrastructure contains multiple deployments

  It is up to the deployment how it hooks into an infrastructure (if it does)

  Types of deployment:

    Development: 
      every node runs inside the same process and routing is done with function end-points
      servers are localhost

    Local:
      every node runs as a seperate process and is managed by mongroup
      servers are localhost

    Binary Star:
      there are 2 or more physical servers and each replicates from each other and load-balances

    Cloud:
      API keys are present for cloud provisioning and the infrastructure becomes elastic 

    quarry.io:
      Use the quarry.io cloud for automatic elastic deployment

  The deployment type decides which folder the modules are loaded from


 */

/*


  Constructor




 */

Network.initialize = function(options){
  this.options = options || {};
  
  // the metal we have at our disposal
  this.instances = {};

  // the stacks this deployment is currently running
  this.stacks = {};

  // what nodes are on what instances
  this.allocations = {};
  this.system_allocations = {};
  
  // our waiting until everything is ready list of fns
  this.ready_callbacks = [];

  this._is_ready = false;
  this._booted = false;

  this.currentport = 21000;

  return this;
}

/*

  Network entry point

  Provides a supply chain into the Reception so it can route to the rest of the network

 */

Network.warehouse = function(hostname, callback){
  var self = this;
  var warehouse = new Warehouse();
  var client = this.get_client(hostname);
  var root_supply_chain = client.rpc('/');
  warehouse.use(root_supply_chain);
  warehouse.networkmode = true;
  warehouse.ready(function(container){
    callback && callback(container);
  })
  
  return this;
}

Network.get_port = function(){
  this.currentport++
  return this.currentport;
}

Network.toJSON = function(){
  return this.options;
}

Network.prepare = function(callback){
  callback && callback();
}

/*

  This actually triggers the whole build and is a temp dev bootloader



 */

Network.ready = function(fn){
  var self = this;

  if(this._is_ready){
    fn && fn(this);
    return this;
  }

  this.ready_callbacks.push(fn);

  if(this._booted){
    return this;
  }

  return this;
  
}

Network.listen = function(fn){
  var self = this;
  this.ready(fn);
  this.boot(function(error){
    self.trigger_ready();
  })
  return this;
}

Network.connect = function(fn){
  var self = this;
  this.ready(fn);
  this.boot(function(error){
    self.trigger_ready();
  })
  return this;
}

Network.trigger_ready = function(){
  var self = this;
  self._booted = true;
  self._is_ready = true;
  _.each(this.ready_callbacks, function(ready_callback){
    ready_callback && ready_callback(self);
  })
  return this;
}



/*

  Main build function
  
  Build up our instances (metal) and stacks (software installations)

 */

Network.boot = function(booted){
  var self = this;

  if(this._booted){
    return this;
  }

  this._booted = true;

  async.series([

    function(next_step){
      self.prepare(next_step);
    },

    function(next_step){
      async.parallel([
        // step 1 - load all of the stack node trees from their folders
        function(loaded){
          self.load_stacks(loaded);
        },
        
        // step 2 - load the instances we can connect to
        function(loaded){
          self.load_instances(loaded);
        }
      ], next_step);
    },

    // step 3 - allocate the instances we have on our network
    function(loaded){
      self.allocate(loaded);
    },

    // step 4 - get the nodes running on the instances
    function(loaded){
      self.deploy(loaded);
    },

    // step 5 - setup post bootloading routes
    function(loaded){
      self.post_booted(loaded);
    }

  ], function(error){
    booted && booted(error);    
  })

  return this;
}



/*

  Get a map of this network



 */

Network.map = function(){
  var self = this;

  function toJSON(obj){
    return obj.toJSON();
  }

  var map = {
    network:this.options,
    instances:{},
    nodes:{},
    allocations:this.allocations
  };

  _.each(this.instances, function(instance){
    map.instances[instance.id] = instance;//.toJSON();
  })

  _.each(this.stacks, function(stack){
    _.each(stack.nodes, function(node){
      map.nodes[node.id] = node;//.toJSON(true);
    })
  })

  return map;
}

/*

  Add a new stack and boot it



 */

Network.add_stack = function(stack){
  if(!stack._stack){
    stack = StackFactory(stack);
  }

  this.stacks[stack.id] = stack;

  return this;
}

Network.stack = Network.add_stack;

Network.add_instance = function(instance){
  this.instances[instance.id] = instance;
  return this;
}

Network.get_instance = function(id){
  return this.instances[id];
}

/*

  Prepare the stacks by scanning their folders and building up a node tree



 */

Network.load_stacks = function(loaded){
  var self = this;

  async.forEach(_.keys(this.stacks), function(hostname, next_stack){
    var stack = self.stacks[hostname];
    stack.load(next_stack);
  }, loaded);
}

Network.map_allocation = function(node, allocation){
  var data = node.get('data') || {};

  if(data.pubsub){
    allocation.pubsub = true;
    delete(allocation.port);
    allocation.ports = {
      pub:this.get_port(),
      sub:this.get_port()
    }
  }

  if(data.switchboard){
    allocation.switchboard = true;
  }

  return allocation;
}


Network.allocate_node = function(stack, node, instance){
  var self = this;
  if(!this.allocations[stack.id]){
    this.allocations[stack.id] = {};
  }

  var allocations = this.allocations[stack.id];

  allocations[node.get('stackpath')] = this.map_allocation(node, {
    stack_id:stack.id,
    instance_id:instance.id,
    node_id:node.id,
    port:this.get_port()
  })

  return this;
}

Network.get_client = function(stack_id){
  var self = this;
  var allocations = self.allocations[stack_id];
  
  var network_config = {
    /*

      The hostname of the base stack

     */
    stack_id:stack_id,

    /*

      All the auxillary settings contained within the network

     */
    network:this.toJSON(),

    /*

      The map of the other allocations in this stack
      We can build a client to connect to these places using this

     */
    allocations:allocations
  }

  return this.client_factory(network_config);
}

Network.client_factory = function(data){
  return new Client(data);
}

/*

  Build the info we will send to the bootloader
  
*/
Network.get_deployment = function(stack_id, allocation_id){
  var self = this;
  var allocations = self.allocations[stack_id];
  var allocation = allocations[allocation_id];
  var map = this.map();
  var instance = map.instances[allocation.instance_id];
  var node = map.nodes[allocation.node_id];

  var node_data = node.toJSON();

  node_data.mountpaths = _.map(node_data.mounts, function(mount){
    return {
      stackpath:mount.stackpath,
      mountpoint:mount.mountpoint
    }
  })

  node_data.mounts = [];

  return new Deployment({
    /*

      The hostname of the base stack

     */
    stack_id:stack_id,

    /*

      The path of the node we are booting

     */
    allocation_id:allocation_id,

    /*

      The JSON for the node - this contains code path etc

     */
    node:node_data,

    /*

      The instance we are booting this node on

     */
    instance:instance.toJSON(),

    /*

      All the auxillary settings contained within the network

     */
    network:this.toJSON(),

    /*

      The map of the other allocations in this stack
      We can build a client to connect to these places using this

     */
    allocations:allocations
  })

}

/*

  Get the code loaded onto the instances

 */

Network.deploy = function(booted){

  var self = this;
  var map = this.map();

  // deploy each stack in parallel
  async.forEach(_.keys(this.stacks), function(stack_id, next_stack){

    var stack = self.stacks[stack_id];
    var allocations = self.allocations[stack_id];
    var switchboard_path = null;

    var pubsubs = _.filter(_.keys(allocations), function(id){
      var allocation = allocations[id];
      if(allocation.switchboard){
        switchboard_path = id;
      }
      return allocation.pubsub;
    })

    var rpcs = _.filter(_.keys(allocations), function(id){
      var allocation = allocations[id];
      return !allocation.pubsub;
    })

    async.series([

      /*

        Boot the pubsubs first

       */
      function(nextseries){
        async.forEach(pubsubs, function(allocation_id, next_allocation){

          self.deploy_pubsub(self.get_deployment(stack_id, allocation_id), next_allocation);
          
        }, nextseries);
      },

      /*

        Then boot the RPCs

       */
      function(nextseries){
        async.forEach(rpcs, function(allocation_id, next_allocation){

          self.deploy_rpc(self.get_deployment(stack_id, allocation_id), next_allocation);
          
        }, nextseries);
      }
    ], next_stack)
    

  }, booted);

  return this;
}

Network.post_booted = function(loaded){
  
  var self = this;

  loaded && loaded();
}

/*

  Get a handle on what instances we have in our network


 */

Network.load_instances = function(loaded){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: allocate_instance');
  return this;
}



/*

  Loop through the stacks deciding how the instances are divided


 */

Network.allocate = function(loaded){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: allocate');
  return this;
}


/*

  Take a single node and decide how to deploy it

  We then cycle through the nodes children and recurse doing the same

  We have already analysed the stack with regard our total resources

  Each node in the stack will have min_servers & max_servers because of this

 */

Network.deploy_rpc = function(deployment, options, callback){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: deploy_rpc');
  return this;
}

Network.deploy_pubsub = function(deployment, options, callback){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: deploy_pubsub');
  return this;
}