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
var eyes = require('eyes');
var _ = require('lodash');
var Container = require('../../container');
var async = require('async');
var dye = require('dye');
var log = require('logule').init(module, 'StackContainer');
var jsonloader = require('../../tools/jsonloader');
var fs = require('fs');
var Stack = require('./stack');

/*

  quarry.io - stack container

  looks after running all of the stacks on one network

  
*/

module.exports = StackContainer;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function StackContainer(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(StackContainer, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
StackContainer.prototype.initialize = function(options){
  var self = this;
  options || (options = {});
  this.options = options;
  this.stacks = [];
  this.localfolders = this.options.localfolders || [];
}

StackContainer.prototype.prepare = function(callback){

  var self = this;

  log.info('preparing');

  async.series([
    function(next){
      self.slurpstacks(next);
    }
  ], callback)

}

StackContainer.prototype.get_layout = function(){

  var layout = Container.new('stacks', this.options);

  log.info('building layout');

  return layout;
}

StackContainer.prototype.assign_database = function(db){
  this.db = db;
  return this;
}

/*

  load up a stack from a folder
  
*/

StackContainer.prototype.build_stack = function(folder){
  var self = this;
  var configpath = folder + '/quarry.json';

  var config = jsonloader(configpath, function(){
    process.exit();
  })

  if(!config){
    return;
  }

  config.attr || (config.attr = {});
  config.attr.configpath = configpath;
  config.attr.stackfolder = folder;

  var stack = new Stack(config);
  
  return stack;
}

/*

   build all of the stacks the network found in folders
  
*/
StackContainer.prototype.slurpstacks = function(callback){

  var self = this;

  log.info('slurping stacks');

  /*
  
    these are the stacks slupred in from the folder structure
    of the network - they will added to the database once it's
    up and running
    
  */
  async.forEach(this.localfolders, function(stackfolder, next_stack){

    log.info('slurping stack: ' + dye.green(stackfolder));

    var stack = self.build_stack(stackfolder);

    if(!stack){
      log.error('stack: ' + stackfolder + ' failed to load');
      next_stack();
    }

    self.stacks.push(stack);
    next_stack();

  }, callback)
}

/*

  loop each stack and upload the core layout to the database
  
*/
StackContainer.prototype.uploadstacks = function(callback){

  var self = this;
  log.info('uploading stacks');

  async.forEach(self.stacks, function(stack, next_stack){

    log.info('uploading stack: ' + dye.green(stack.id));

    stack.upload(self.db, next_stack);

  }, callback)
}

StackContainer.prototype.deploy_workers = function(infrastructure, callback){

  var self = this;
  
  async.forEach(self.stacks, function(stack, next_stack){

    log.info('allocating stack instances: ' + dye.green(stack.id));

    /*
    
      get the instances upon which we will boot the core stack services like:

      router
      reception
      
    */
    infrastructure.get_stack_allocation(stack, function(error, allocation){

      stack.allocate(allocation, next_stack);

    })

  }, callback)
}