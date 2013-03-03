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
var utils = require('../utils');
var eyes = require('eyes');
var _ = require('lodash');
var Container = require('../container');
var async = require('async');
var jsonloader = require('../tools/jsonloader');
var fs = require('fs');
var wrench = require('wrench');
var browserify = require('browserify');
var compressor = require('node-minify');
var Node = require('./node');
var Device = require('./device');

/*

  quarry.io - stack container

  looks after running all of the stacks on one network

  
*/

module.exports = StackCollection;

/*

  these are the methods that an infrastructure interface must implement
  
*/

function StackCollection(systemconfig){
  EventEmitter.call(this);
  this.systemconfig = systemconfig;
  this.stacks = {};
}

util.inherits(StackCollection, EventEmitter);

StackCollection.prototype.spark = function(callback){
  var self = this;

  async.series([

    /*
    
      this is the temporary folder for building code
      
    */
    function(next){
      wrench.rmdirSyncRecursive(self.systemconfig.attr('buildfolder'), true);
      wrench.mkdirSyncRecursive(self.systemconfig.attr('buildfolder'));
      next();
    },

    /*
    
      build the database server
      
    */
    function(next){
      self.build_database(next);
    },

    /*
    
      get the stacks loaded in
      
    */
    function(next){
      self.slurpstacks(next);
    }

  ], callback)

}

/*

  this builds the core system database which is a quarry db provider

  each stack gets it's own Mongo collection which means we can virtual
  host stacks on the cloud quarry
  
*/
StackCollection.prototype.build_database = function(callback){

  this.databaseserver = Device('system.server', {
    systemconfig:this.systemconfig
  })

  this.databaseserver.bind();

  this.databaseclient = Device('system.client', {
    systemconfig:this.systemconfig
  })

  callback && callback();
  
  return this;
}

/*

   build all of the stacks the network found in folders
  
*/
StackCollection.prototype.slurpstacks = function(callback){

  var self = this;

  /*
  
    these are the stacks slupred in from the folder structure
    of the network - they will added to the database once it's
    up and running
    
  */

  async.forEachSeries(this.systemconfig.attr('slurpfolders') || [], function(stackfolder, next_stack){

    self.build_stack(stackfolder, function(error, stack){

      if(!stack){
        console.log('stack: ' + stackfolder + ' failed to load');
        process.exit();
        next_stack();
      }

      self.stacks[stack.id()] = stack;

      next_stack();
    })

  }, callback)
}


/*

  load up a stack from a folder
  
*/

StackCollection.prototype.build_stack = function(folder, callback){
  var self = this;

  var configpath = folder + '/quarry.json';
  var stack = null;

  jsonloader(configpath, function(error, rawstack){

    rawstack.config.folder = folder;

    /*
    
      this turns the raw json into some containers
      
    */
    var stack = self.process_raw_stack(rawstack);

    async.series([

      /*
      
        this compiles the browser side codez
        
      */
      function(next){
        self.compile_stack_code(stack, next);
      },

      /*
      
        get ourselves a client to speak to said database
        
      */
      function(next){
        

        var db = self.databaseclient.connect('/systemdb/' + stack.id());

        db.append(stack).ship(function(){
          next();
        })
      }

    ], function(){
      callback(null, stack);
    })
  })
}

StackCollection.prototype.process_raw_stack = function(rawstack){

  function process_department(type, nodearray){

    var department = Container.new('department', {
      name:type
    }).addClass(type)

    var nodes = Container.new('nodes', {
      name:type + ' nodes'
    }).addClass(type)

    var workers = Container.new('workers', {
      name:type + ' workers'
    }).addClass(type)

    department.append([nodes, workers]);

    nodes.append(_.map((nodearray || []), function(rawnode){
      var node = Container.new('node', rawnode)
        .addClass(department)

      if(node.hasClass('web') || node.hasClass('warehouse')){

        node.append(_.map((node.attr('middleware') || []), function(config){
          return Container.new('middleware', config);
        }))

        node.reset('middleware');
      }
    
      return node;
    }))

    return department;
  }

  var stack = Container.new('stack', rawstack.config);

  stack.id(stack.attr('name').toLowerCase().replace(/\W/g, ''));

  stack.append(_.map(Node.departments, function(flavour){

    return process_department(flavour, rawstack.departments[flavour]);

  }))

  return stack;
}

/*

  compile the browser side container code and get it ready for injection into the stack

  the stack config can change how the core code is built here (well later once 
  Rodney finishes running around like Robin from Batman : )
  
*/
StackCollection.prototype.compile_stack_code = function(stack, callback){
  var self = this;

  var codefolder = stack.attr('folder');
  
  var b = browserify();

  b.require(__dirname + '/../container');
  var st = b.bundle();

  fs.writeFileSync(codefolder + '/browser.js', st, 'utf8');

  new compressor.minify({
    type: 'uglifyjs',
    fileIn: codefolder + '/browser.js',
    fileOut: codefolder + '/browser.min.js',
    callback: function(error){
      if(error){
        throw new Error(error);
      }
      callback();
    }
  })
  
}