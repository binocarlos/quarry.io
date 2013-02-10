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
var log = require('logule').init(module, 'Stack Collection');
var jsonloader = require('../../tools/jsonloader');
var fs = require('fs');
var Stack = require('./proto');
var Allocation = require('./allocation');

/*

  quarry.io - stack container

  looks after running all of the stacks on one network

  
*/

module.exports = StackCollection;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function StackCollection(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(StackCollection, EventEmitter);

/*

  setup the deployment with the functions for the various bits
  
*/
StackCollection.prototype.initialize = function(options){
  var self = this;
  options || (options = {});
  this.options = options;
  this.stacks = {};
  this.localfolders = this.options.stacks.localfolders || [];
}

StackCollection.prototype.prepare = function(callback){

  var self = this;

  async.series([
    function(next){
      self.slurpstacks(next);
    }
  ], callback)

}

StackCollection.prototype.get_layout = function(options){

  var layout = Container.new('system', options);

  log.info('building layout');

  return layout;
}

StackCollection.prototype.assign_database = function(db){
  this.db = db;
  
  return this;
}

/*

   build all of the stacks the network found in folders
  
*/
StackCollection.prototype.slurpstacks = function(callback){

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

    self.stacks[stack.id] = {
      id:stack.id,
      stack:stack
    }

    next_stack();

  }, callback)
}


/*

  load up a stack from a folder
  
*/

StackCollection.prototype.build_stack = function(folder){
  var self = this;
  var configpath = folder + '/quarry.json';

  var options = jsonloader(configpath, function(){
    process.exit();
  })

  if(!options){
    return;
  }

  options.config || (config.attr = {});
  options.config.configpath = configpath;
  options.config.stackfolder = folder;
  options.config.database = this.options.database;

  var stack = new Stack(options);
  
  return stack;
}

/*

  loop each stack and upload the core layout to the database
  
*/
StackCollection.prototype.uploadstacks = function(callback){

  var self = this;
  log.info('uploading stacks');

  async.forEach(_.keys(self.stacks), function(stackid, next_stack){

    var stackobj = self.stacks[stackid];

    log.info('uploading stack: ' + dye.green(stackobj.id));

    stackobj.stack.upload(self.db, next_stack);

  }, callback)
}

StackCollection.prototype.allocate = function(infrastructure, callback){

  var self = this;

  log.info(dye.cyan('-------------------------------------------'));
  log.info(dye.cyan('Allocating System'));
  
  async.forEach(_.keys(self.stacks), function(stackid, next_stack){

    var stackobj = self.stacks[stackid];

    log.info('allocating stack instances: ' + dye.green(stackobj.id));

    var allocation = new Allocation(infrastructure, stackobj.stack);

    stackobj.allocation = allocation;
    allocation.build(self.db, next_stack);
    
  }, callback)
}