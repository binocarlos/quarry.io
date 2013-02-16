/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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

var System = require('./system');

var baseconfig = require('./config.json');
var log = require('logule').init(module, 'Network');
var pathutils = require('path');

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
  infrastructure:{
    flavour:'development'
  },
  stacks:{
    localfolders:[],
    codefolder:'/tmp/quarrystackcode'
  },
  database:{
    id:'system',
    stackid:'system',
    stackpath:'/systemdb',
    endpoints:{}
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
  
  this.options = extend({}, defaultconfig, baseconfig, options || {});

  return this;
}

/*

  create a new stack from a folder layout
  and add it to the stacks the network will deploy
  
*/
Network.prototype.slurp = function(path){

  fs.existsSync(path) && this.options.stacks.localfolders.push(pathutils.normalize(path));

  return this;
  
}

/*

  assign the deployment - this can be built ad-hoc
  
*/
Network.prototype.flavour = function(flavour){

  flavour && (this.options.infrastructure.flavour = flavour);

  return this;
}


/*

  the actual lazy kick in and setup everything at once function
  
*/
Network.prototype.boot = function(fn){
  var self = this;
  
  async.series([

    /*
    
      prepare system
      
    */

    function(next){
      log.info('booting the system in: ' + self.options.infrastructure.flavour + ' mode');

      /*
      
        build the system and proxy it's portal
        onto the deployment
        
      */
      self.system = new System(self.options);

      self.system.boot(next);
      
    },

    function(next){
      next();
    }





  ], function(error){

    if(error){
      log.error(error);
      return;
    }

    log.info('done');

  })

  return this;
}