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

  // the global resource list (Mongo, Redis etc) for this deployment
  this.resources = {};

  // the stacks this deployment is currently running
  this.stacks = {};
  
  // our waiting until everything is ready list of fns
  this.ready_callbacks = [];

  this._is_ready = false;
  this._booted = false;

  return this;
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
      async.parallel([
        // step 1 - load all of the stack node trees from their folders
        function(loaded){
          self.load_stacks(loaded);
        },
        
        // step 2 - load the instances we can connect to
        function(loaded){
          self.load_instances(loaded);
        }
      ])
    },

    // step 3 - allocate the instances we have on our network
    function(loaded){
      self.allocate_instances(loaded);
    },

    // step 4 - get the nodes running on the instances
    function(loaded){
      self.deploy_nodes(loaded);
    }

    // monitoring etc etc

  ], function(error){
    booted && booted(error);
  })

  return this;
}


/*

  Add a new stack and boot it



 */

Network.add_stack = function(stack){
  if(!stack._stack){
    stack = StackFactory(stack);
  }
  
  this.stacks[stack.hostname()] = stack;

  return this;
}

Network.stack = Network.add_stack;

/*

  Prepare the stacks by scanning their folders and building up a node tree



 */

Network.load_stacks = function(loaded){
  async.forEach(this.stacks, function(stack, next_stack){
    stack.load(next_stack);
  }, loaded);
}

/*

  Get a handle on what instances we have in our network


 */

Network.load_instances = function(loaded){
  
}

/*

  Loop through the stacks deciding how the instances are divided


 */

Network.allocate_instances = function(loaded){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: allocate_instance');
}

Network.add_instance = function(instance){
  this.instances[instance.get('hostname')] = instance;
  return this;
}

Network.add_instance = function(hostname){
  return this.instances[instance.get('hostname')];
}

/*

  

 */

Network.deploy_nodes = function(){

  
}

/*

  Take a single node and decide how to deploy it

  We then cycle through the nodes children and recurse doing the same

  We have already analysed the stack with regard our total resources

  Each node in the stack will have min_servers & max_servers because of this

 */

Network.deploy_node = function(node){
  console.log('-------------------------------------------');
  console.log('ABSTRACT NETWORK METHOD: deploy_node');
}