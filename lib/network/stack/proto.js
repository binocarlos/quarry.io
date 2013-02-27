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

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var extend = require('xtend');
var log = require('logule').init(module, 'Stack');
var dye = require('dye');
var wrench = require('wrench');
var Warehouse = require('../../warehouse');
var Container = require('../../container');

var FileWatcher = require('../../tools/filewatcher');
var Node = require('../node');

/*

  quarry.io - stack proto

  A stack is a combination of webserver and stackserver to provide
  a full set of web applications

  It lives on a network - seperated from other stacks

  The front end HTTP load balancer knows which domains to route to
  which stack gateway

  The stack gateway provides both HTTP and RPC entrypoints

  It internally works out which node to route the HTTP or RPC request to

  
*/

module.exports = Stack;

var defaultoptions = require('./config.json');
var workerflavours = Node.stackflavours;

function Stack(options){
  EventEmitter.call(this);
  this.initialize(options);
}

util.inherits(Stack, EventEmitter);

/*

  create container data representing the stack layout (api and websites)
  
*/
Stack.prototype.initialize = function(options){
  var self = this;
  options || (options = {});

  /*
  
    setup the skeleton stack options
    
  */

  this.options = extend({}, defaultoptions, options);

  this.config = options.config;
  this.id = this.options.config.id;

  this.workerfolders = {};
  this.configfolders = {};

  /*
  
    this will be set to the system db
    
  */
  this.db = null;
}

/*

  the initial appending of the stack layout to the 'stacks' folder
  of the network system

*/
Stack.prototype.get_layout = function(){

  var options = this.options;

  /*
  
    first build up the stack layout
    
  */
  var root = Container.new('stack', options.config).id(options.config.id);
  var services = Container.new('services');
  var workers = Container.new('workers', options.workers.config);


  _.each(workerflavours, function(flavour){

    var flavouroptions = options[flavour] || {};

    if(!flavouroptions){ 
      return;
    }

    var servicegroup = Container.new('group', flavouroptions).addClass(flavour).id('services');
    var workergroup = Container.new('group').addClass(flavour).id('workers');

    services.append(servicegroup);
    workers.append(workergroup);
    
  })

  root.append([services, workers]);

  return root;
}

/*

  expose the root toJSON
  
*/

Stack.prototype.toJSON = function(){
  return this.root ? this.root.toJSON() : {};
}

/*

  upload the stack to the database
  stackcontainer is the generic 'stacks' node to append to
  
*/
Stack.prototype.upload = function(container, callback){

  var self = this;

  var layout = this.get_layout();

  log.info('uploading: ' + dye.green(this.id));
  
  async.series([

    /*
    
      first get the code for the stack into the general bin
      
    */
    function(next){

      //log.info(dye.red('COPY STACK FOLDER -> ') + self.config.stackfolder + ' --> ' + self.config.codefolder);

      //wrench.copyDirSyncRecursive(self.config.stackfolder, self.config.codefolder);

      //log.info(dye.red('INJECT CORE FOLDER -> ') + self.config.corefolder + ' --> ' + self.config.codefolder + '/core');

      wrench.rmdirSyncRecursive(self.config.stackfolder + '/core', true);
      wrench.copyDirSyncRecursive(self.config.corefolder, self.config.stackfolder + '/core');

      self.config.codefolder = self.config.stackfolder;
      
      next();

    },

    /*
    
      if we are in dev mode then watch the code folder and update the deployment on changes
      
    */
    function(next){

      if(self.options.config.networkflavour!='development'){
        next();
        return;
      }

      self.watcher = new FileWatcher(self.config.stackfolder, self.config.codefolder);

      next();
    },

    /*
    
      now upload the stack data into the db
      
    */
    function(next){

      container
        .append(layout)
        .ship(function(res){

          self.db = layout;

          callback();
        })
    }
  ])
  
}

Stack.prototype.get_workerdb = function(flavour){
  return this.db.find('workers > group.' + flavour);
}

Stack.prototype.get_servicedb = function(flavour){
  return this.db.find('services > group.' + flavour);
}

Stack.prototype.get_workers_root = function(){
  return this.db.find('workers');
}