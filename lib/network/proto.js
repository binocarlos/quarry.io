/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var extend = require('xtend');

var eyes = require('eyes');
var _ = require('lodash');
var async = require('async');
var fs = require('fs');

var dye = require('dye');

var pathutils = require('path');

var Container = require('../container');
var Node = require('./node');
var Device = require('./device');
var Infrastructure = require('./infrastructure');
var StackCollection = require('./stackcollection');

/*

  quarry.io - network proto

  the overall co-ordinator of the stacks and their services

  the network is a server that will boot up quarry stacks on the resources provided

  it knows about 2 things:

    the instances (and other resources like DNS) that are physically available
    and how to ask for more / shut some down dependent upon load

    the allocation of a stack onto those instances

    how a stack is allocated to one physical network is dependent upon the stack's profile

    this describes the maximum budget and characteristics of the automatic scaling a stack
    can do

    the network is the boss of this however because ultimately it owns the resources
    that are available

    a stack can only 'ask' the network for stuff not expect it
  
*/

module.exports = Network;


/*

  skeleton network config
  
*/
var defaultconfig = {
  name:"quarry.io Network",
  comment:"The first network ting",
  flavour:'development',
  slurpfolders:[],
  buildfolder:'/tmp/quarrystackcode',
  httpport:17778,
  servers:{
    redis:{
      hostname:"127.0.0.1",
      port:6379
    },
    mongo:{
      hostname:"127.0.0.1",
      port:27017
    }
  }
}

function Network(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Network, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Network.prototype.initialize = function(options, callback){
  
  this.systemconfig = Container.new('systemconfig', extend({}, defaultconfig, options || {}));

  return this;
}

/*

  create a new stack from a folder layout
  and add it to the stacks the network will deploy
  
*/
Network.prototype.slurp = function(path){
  var folders = this.systemconfig.attr('slurpfolders') || [];
  fs.existsSync(path) && folders.push(pathutils.normalize(path));
  this.systemconfig.attr('slurpfolders', folders);
  return this;
}

/*

  assign the deployment - this can be built ad-hoc
  
*/
Network.prototype.flavour = function(flavour){
  flavour && (this.systemconfig.attr('flavour', flavour));
  return this;
}


/*

  prepare the core system resources (like the system switchboard and core database)
  
*/
Network.prototype.boot = function(callback){

  var self = this;

  async.series([

    /*
    
      build the infrastructure using the flavour to decide which
      mixins to use
      
    */
    function(next){
      self.infrastructure = Infrastructure(self.systemconfig);
      self.infrastructure.prepare(function(){
        self.systemconfig.attr('systemendpoints', {
          rpc:self.infrastructure.rpcendpoint('system', 'rpc'),
          pub:self.infrastructure.rpcendpoint('system', 'pub'),
          sub:self.infrastructure.rpcendpoint('system', 'sub')
        })
        next();
      });
    },


    /*
    
      the manager for the stacks
      
    */
    function(next){
      self.collection = new StackCollection(self.systemconfig);
      self.collection.spark(next);
    }

  ], callback)

}