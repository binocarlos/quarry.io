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
  this.id = this.options.hostname;
  this.path = options.path;
  this.nodes = {};
  return this;
}

Stack.hostname = function(){
  return this.options.hostname;
}

Stack.load = function(fn){
  var self = this;
  self.scanfolder(function(error, filetree){
    self.buildnodes(filetree, function(error, root_node){
      self.root_node = root_node;
      root_node.recurse(function(n){
        self.nodes[n.id] = n;
      })
      fn(null, self);
    })
  })
}

Stack.recurse = function(fn){
  this.root_node && this.root_node.recurse(fn);
  return this;
}

Stack.toJSON = function(){
  return this.root_node && this.root_node.toJSON();
}

Stack.buildnode = function(fileinfo){
  fileinfo.stackid = this.id;
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

  var root_node = nodes['/'];

  if(!root_node){
    throw new Error('warning - cannot find root node for: ' + this.hostname());
  }

  // now we inject the system level things needed by a network (like reception, holdingbay & switchboard)
  this.add_system_nodes(root_node);

  _.each(nodes, function(node, path){
    if(path=='/'){
      return;
    }
    var parent_path = path.replace(/\w+\/$/, '');
    var parent = nodes[parent_path] ? nodes[parent_path] : root_node;
    if(parent){      
      parent.mount(node);
    }
    else{
      throw new Error('warning - cannot find parent for mount: ' + path + ' in ' + this.hostname())
    }
  })

  callback(null, root_node);
}

Stack.add_system_nodes = function(root_node){

  // the reception
  root_node.mount(this.buildnode({
    path:'/reception.raw',
    ext:'raw',
    raw:{
      "type":"reception"
    }
  }))

  // the switchboard
  root_node.mount(this.buildnode({
    path:'/switchboard.raw',
    ext:'raw',
    raw:{
      "type":"switchboard"
    }
  }))
}

// scan the root folder for .js and .json configs for nodes
Stack.scanfolder = function(callback){

  var self = this;

  serverutils.scanfolder({
    path:this.path
  }, callback)
  
}