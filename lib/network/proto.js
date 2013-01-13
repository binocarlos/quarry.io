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
var BackboneDeep = require('../vendor/backbonedeep');
var fs = require('fs');
var wrench = require('wrench');
var GatewayClient = require('./gatewayclient');
var path = require('path');

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

var Network = module.exports = BackboneDeep.extend({
  initialize:function(options){
    
    // the metal we have at our disposal
    this.instances = {};

    // the stacks this deployment is currently running
    this.stacks = {};
    this.webservers = {};

    // what nodes are on what instances
    this.allocations = {};
    this.system_allocations = {};
    
    // our waiting until everything is ready list of fns
    this.ready_callbacks = [];

    this._is_ready = false;
    this._booted = false;

    this.currentport = 21001;

    var folder_path = this.local_folder();

    if(folder_path && fs.existsSync(folder_path+'/network.json')){
      var config = require(folder_path+'/network.json');
      this.set(config);
    }

    var ports = this.get('ports') || {};

    var final_ports = _.defaults(ports, this.get('super_ports') || {}, {
      http:80,
      rpc:20900,
      pub:20910,
      sub:20920
    })

    this.set('ports', final_ports);
    
    this.set('resources.localfiles', folder_path+'/resources/files');

    return this;
  },

  local_folder:function(){
    var src = path.normalize(this.get('folder'));

    if(!src.match(/^\//)){
      src = process.cwd() + '/' + this.get('folder');
    }
    var ret = src.replace(/\/$/, '');
    return ret;
  },
  


/*

  ******************************************************************
  ******************************************************************
  ******************************************************************
  Warehouses


 */

  /*

    Network entry point

    Provides a supply chain into the Reception so it can route to the rest of the network

   */

  warehouse:function(hostname, callback){
    var self = this;
    var mode = this.get('warehouse_mode');

    var factory = {
      rpc:function(){
        throw new Error('this network has not yet been booted - we cannot get a warehouse yet')
      },

      switchboard:function(){
        throw new Error('this network has not yet been booted - we cannot get a switchboard yet')   
      }
    }
    
    var warehouse = new Warehouse();

    /*
    
      we are in server mode so we have internal access to the network
      
    */
    if(mode=='server'){
      var client = self.get_client(hostname);

      factory.rpc = function(){
        return client.rpc('/');
      }

      factory.switchboard = function(){
        return client.pubsub('reception.switchboard');
      }
    }
    /*
    
      we are in client mode so we go via the gateway
      
    */
    else if(mode=='client'){
      var client = self.gatewayclient;

      var stack = client.stack(hostname);

      factory.rpc = function(){
        return stack.rpc;
      }

      factory.switchboard = function(){
        return stack.switchboard;
      }
    }
    
    
    var supply_chain = factory.rpc();
    var switchboard = factory.switchboard();

    /*
    
      this is the switchboard passed to the client
      
    */
    warehouse.switchboard = switchboard;
    warehouse.use(supply_chain);
    
    
    warehouse.networkmode = true;
    warehouse.ready(function(container){
      callback && callback(container);
    })
    
    return this;
  },

  get_ports:function(){
    return {
      rpc:this.currentport++,
      pub:this.currentport++,
      sub:this.currentport++,
      http:this.currentport++
    }
  },

  prepare:function(fn){
    fn && fn();
  },

  isrunning:function(){
    return false;
  },
  
  ensure_folders:function(fn){
    fn && fn();
  },

  ensure_stack_folder:function(stack_id){

  },

/*

  ******************************************************************
  ******************************************************************
  ******************************************************************
  Ready Stack


 */

  /*

    This actually triggers the whole build and is a temp dev bootloader



   */

  start:function(fn){
    var self = this;

    if(this._is_ready){
      fn && fn(this);
      return this;
    }

    this.ready_callbacks.push(fn);

    if(this._loading){
      return this;
    }

    this.load(function(error){
      self.set('warehouse_mode', 'server');
      self.trigger_ready();
    })
    return this;
  },

  connect:function(fn){
    var self = this;
    var client = new GatewayClient({
      ports:this.get('ports')
    })

    if(this._is_ready){
      fn && fn(this);
      return this;
    }

    this.ready_callbacks.push(fn);

    if(this._loading){
      return this;
    }

    self.gatewayclient = client;
    self.gatewayclient.connect(function(){
      self.set('warehouse_mode', 'client');
      self.trigger_ready();
    })
    
    return this;
  },

  boot:function(fn){
    return this.start(fn);
  },

  listen:function(fn){
    return this.start(fn);
  },

  stop:function(fn){
    fn && fn();
  },

  debug:function(fn){
    fn && fn();
  },

  status:function(fn){
    fn && fn();
  },

  trigger_ready:function(){
    var self = this;
    self._is_ready = true;
    _.each(this.ready_callbacks, function(ready_callback){
      ready_callback && ready_callback(self);
    })
    return this;
  },

  /*

    Main build function
    
    Build up our instances (metal) and stacks (software installations)

   */

  load:function(booted){

    var self = this;

    if(this._loading){
      return this;
    }

    this._loading = true;

    self.emit('message', {
      text:'Loading Network',
      color:'red',
      depth:1,
      data:this.toJSON()
    })

    async.series([

      function(next_step){

        self.emit('message', {
          text:'1. Preparing',
          color:'green',
          depth:2
        })

        self.prepare(next_step);
      },

      function(next_step){

        self.emit('message', {
          text:'2. Load',
          color:'green',
          depth:2
        })

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

        self.emit('message', {
          text:'3. Allocate',
          color:'green',
          depth:2
        })

        self.allocate(loaded);
      },

      // step 4 - get the nodes running on the instances
      function(loaded){

        self.emit('message', {
          text:'4. Deploy',
          color:'green',
          depth:2
        })

        self.deploy(loaded);
      },

      // step 5 - setup post bootloading routes
      function(loaded){

        self.emit('message', {
          text:'5. Post-Deploy',
          color:'green',
          depth:2
        })

        self.post_booted(loaded);
      }

    ], function(error){
      booted && booted(error);    
    })

    return this;
  },



  /*

    Get a map of this network



   */

  map:function(){
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
  },

  /*

    Add a new stack and boot it



   */

  add_stack:function(stack){
    if(!stack._stack){
      stack = StackFactory(stack);
    }

    this.stacks[stack.id] = stack;

    return this;
  },

  stack:function(stack){
    return this.add_stack(stack);
  },

  add_instance:function(instance){
    this.instances[instance.id] = instance;
    return this;
  },

  get_instance:function(id){
    return this.instances[id];
  },

  /*

    Prepare the stacks by scanning their folders and building up a node tree



   */

  load_stacks:function(loaded){
    var self = this;

    async.series([
      function(next){
        fs.readdir(self.get('folder')+'/stacks', function(error, stack_list){
          _.each(stack_list, function(stackname){
            self.emit('message', {
              text:'Stack Folder Located: ' + stackname,
              color:'cyan',
              depth:3
            })
            self.stack({
              hostname:stackname,
              folder:self.get('folder')+'/stacks/'+stackname
            })
          })
          next();
        })
      },

      function(next){
        async.forEach(_.keys(self.stacks), function(hostname, next_stack){
          var stack = self.stacks[hostname];
          self.emit('message', {
            text:'Loading Stack: ' + hostname,
            color:'cyan',
            depth:3
          })
          stack.load(next_stack);
        }, next)
      },

      function(next){
        _.each(self.stacks, function(stack, hostname){
          self.ensure_stack_folder(hostname);
        })
        next();
      }
    ], loaded)
  },


  /*
  
    the gateway allocate is for the whole network

    it does virtual hosting to work out what stack to proxy into

    there is one gateway per network
    
  */
  allocate_gateway:function(instance){
    var self = this;
    this.gateway_instance = instance;
    self.emit('message', {
      text:'Allocate Gateway: -> ' + instance.id,
      color:'cyan',
      depth:4
    })
    return this;
  },

  /*
  
    the website is for one stack
    
  */
  allocate_webserver:function(stack, instance){
    var self = this;
    this.webservers[stack.id] = {
      stack_id:stack.id,
      instance_id:instance.id,
      ports:this.get_ports()
    }
    
    self.emit('message', {
      text:'Allocate Webserver: -> ' + stack.id + ' : ' + instance.id,
      color:'cyan',
      depth:4
    })
    return this;
  },

  allocate_node:function(stack, node, instance){
    var self = this;
    if(!this.allocations[stack.id]){
      this.allocations[stack.id] = {};
    }

    var allocations = this.allocations[stack.id];

    allocations[node.get('stackpath')] = {
      stack_id:stack.id,
      instance_id:instance.id,
      node_id:node.id,
      ports:this.get_ports()
    }

    self.emit('message', {
      text:'Allocate Node: ' + stack.id + node.id + ' -> ' + instance.id,
      color:'cyan',
      depth:4
    })

    return this;
  },

  get_client_config:function(stack_id){
    var self = this;
    var allocations = self.allocations[stack_id];
    
    return {
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
  },

  get_client:function(stack_id){
    var self = this;
    
    return this.client_factory(this.get_client_config(stack_id));
  },

  client_factory:function(data){
    return new Client(data);
  },

  /*

    Build the info we will send to the bootloader
    
  */
  get_deployment:function(stack_id, allocation_id){
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

  },

  /*

    Get the code loaded onto the instances

   */

  deploy:function(booted){

    var self = this;
    var map = this.map();

    async.series([

      /*
      
        the first step is to boot each stack in parallel
        
      */
      function(next_series){
        
        async.forEach(_.keys(self.stacks), function(stack_id, next_stack){

          var stack = self.stacks[stack_id];
          var allocations = self.allocations[stack_id];
          var switchboard_path = null;

          async.forEach(_.keys(allocations), function(allocation_id, next_allocation){

            self.deploy_rpc(self.get_deployment(stack_id, allocation_id), next_allocation);
            
          }, next_stack);

        }, next_series);
      },

      /*
      
        now we boot the webservers
        
      */
      function(next_series){
        
        async.forEach(_.keys(self.stacks), function(stack_id, next_stack){

          var stack = self.stacks[stack_id];
          var websites = stack.websites;
          
          eyes.inspect(websites);

          console.log('-------------------------------------------');
          console.log('time for a webserver (provider / http server) and website (express middleware routed by hostname)');

          process.exit();
          //self.deploy_websites(stack
          next_stack();

        }, next_series);
      },

      /*
      
        the next step is to deploy the gateways (HTTP/RPC) for the whole network

        
      */

      function(next_series){

        self.deploy_gateway(next_series);

      }

    ], booted);

    return this;
  },

  post_booted:function(loaded){
    
    var self = this;

    loaded && loaded();
  },

  /*

    Get a handle on what instances we have in our network


   */

  load_instances:function(loaded){
    console.log('-------------------------------------------');
    console.log('ABSTRACT NETWORK METHOD: allocate_instance');
    return this;
  },



  /*

    Loop through the stacks deciding how the instances are divided


   */

  allocate:function(loaded){
    console.log('-------------------------------------------');
    console.log('ABSTRACT NETWORK METHOD: allocate');
    return this;
  },


  pubsub_message:function(deployment){
    var self = this;
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
  },

  rpc_message:function(deployment){
    var self = this;
    
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
  },

  deploy_gateway:function(callback){
    console.log('-------------------------------------------');
    console.log('ABSTRACT NETWORK METHOD: deploy_gateway');
    return this;
  },

  deploy_rpc:function(deployment, options, callback){
    console.log('-------------------------------------------');
    console.log('ABSTRACT NETWORK METHOD: deploy_rpc');
    return this;
  }
})