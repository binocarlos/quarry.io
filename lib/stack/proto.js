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
var Warehouse = require('../warehouse');
var eyes = require('eyes');
var serverutils = require('../server/utils');
var fs = require('fs');
var Node = require('./node');

//var Proto = require('./proto');

var Stack = module.exports = {};


/*
  Quarry.io - Stack
  -----------------

  Represents one warehouse installation


 */

/*


  Constructor




 */

Stack._stack = true;

Stack.initialize = function(options){
  options || (options = {});
  this.options = options;
  this.path = options.path;
  return this;
}

Stack.load = function(loaded){
  var self = this;
  this.scanfolder(function(error){
    loaded(error, self);
  })
}

Stack.hostname = function(){
  return this.options.hostname;
}

Stack.load = function(fn){
  var self = this;
  self.scanfolder(function(error, filetree){
    self.buildnodes(filetree, function(error, root_node){
      self.root_node = root_node;
      fn(null, self);
    })
  })
}

Stack.recurse = function(fn){
  this.root_node && this.root_node(recurse);
  return this;
}

Stack.toJSON = function(){
  return this.root_node && this.root_node.toJSON();
}

Stack.buildnode = function(fileinfo){
  return new Node(fileinfo);
}

// make a node out of the .json / .js file
Stack.buildnodes = function(filetree, callback){
  var self = this;
  // ignore any other types of file
  var include_types = {
    js:true,
    json:true
  }

  var nodes = {};
  var root_node = null;

  function process_info(info){

    if(info.type=='folder'){
      _.each(info._children, process_info);
    }
    else if(include_types[info.ext]){
      var node = self.buildnode(info);
      nodes[node.get('stackpath')] = node;
    }
  }

  _.each(filetree, process_info);

  _.each(nodes, function(node, path){
    var parent_path = path.replace(/(\w+)?\/$/, '');
    if(parent_path==''){
      root_node = node;
    }
    else{
      var parent_node = parent_path=='' ? root_node : nodes[parent_path];  
      parent_node.mount(node);
    }    
  })

  callback(null, root_node);
}

// scan the root folder for .js and .json configs for nodes
Stack.scanfolder = function(folder, callback){

  var self = this;

  serverutils.scanfolder({
    path:folder
  }, function(error, results){
    if(error || !results){
      callback(error);
      return;
    }
    
    self.buildnodes(results, callback);
  })
  
}