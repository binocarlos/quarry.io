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
var Node = require('../stack/node');
var NetworkFactory = require('../network');
var Warehouse = require('../warehouse');
var io = require('../quarryio');

module.exports = {
  node:node,
  system:system
}


/*
  Quarry.io - Bootloader
  ----------------------

  Gets the code for a single node running on a single instance

  This is run on the actual instance not the master

  The user supplied code that is running inside the bootloader is wrapped
  The wrapper provides access to things like $quarry and io so the code
  can be run from anywhere on the filesystem without worrying about paths

  If the node specifies a json file for it's content then we create the
  factory inside the wrapper


  options:

    connections - a map of the stackpaths we should mount


 */

function load_data(data){
  
  if(!io[data.type]){
    throw new Error(data.type + ' is not a valid autoload type');
  }

  return io[data.type].apply(io, [data]);
}

function load_js(node){
  var path = node.fullpath;

  return require(path)(io);
}

function load_json(node){
  var path = node.fullpath;

  var data = require(path);

  return load_data(data);
}

function load_raw(node){
  return load_data(node.raw);
}

function load_system_code(type, network){
  if(!io[type]){
    throw new Error(type + ' is not a valid system type');
  }

  return io[type];
}

function load_code(node){
  if(node.ext=='js'){
    return load_js(node);
  }
  else if(node.ext=='json'){
    return load_json(node);
  }
  else if(node.ext=='raw'){
    return load_raw(node);
  }
  else{
    return {};
  }
}

function system(options){
  options || (options = {});

  var network = NetworkFactory.client(options.network.type, options.network);
  var type = options.type;
  var allocations = options.allocations || {};
  
  if(!network || !type){
    throw new Error('bootloader needs a new network and type');
  }

  // get the thing representing the node
  var systemClass = load_system_code(type);

  var process = systemClass(options);
  process.network(network);
  
  return process;
}

function node(options){
  options || (options = {});

  var network = NetworkFactory.client(options.network.type, options.network);
  var node = options.node;
  var allocations = options.allocations || {};

  var switchboard = network.switchboard();
  var reception = network.reception();
  
  if(!network || !node){
    throw new Error('bootloader needs a new network and node');
  }

  // get the thing representing the node
  var warehouse = load_code(node);

  // see what it is
  if(!_.isFunction(warehouse.handle)){
    var old_warehouse = warehouse;
    
    // it is a warehouse
    warehouse = Warehouse(options);

    if(_.isFunction(old_warehouse)){
      warehouse.use(old_warehouse);
    }
  }

  // now mount the auto sub-routes
  _.each(node.mounts, function(mount){

    
    var allocation = allocations[mount.stackpath];

    var mountpoint = '/' + mount.stackpath.substring(node.stackpath.length);

    if(!allocation){
      throw new Error('Allocation not found: ' + mount.stackpath);
    }

    var supplychain = network.supplychain(mount.stackpath);

    warehouse.usebefore(mountpoint, supplychain);
  })

  // hook up the routing
  warehouse.usebefore(function(req, res, next){

    req.network = network;
    res.req = req;

    req.broadcast = function(route, message){
      switchboard.broadcast('container', route, message);
    }
    
    req.redirect = function(location){
      // tell the reception to switch out our callback and
      // trigger the redirected request
      switchboard.broadcast('reception', 'holdingbay.' + req.bay_id(), {
        action:'redirect',
        location:location,
        request:req.toJSON()
      })
    }

    req.branch = function(location){
      // tell the reception to switch out our callback and
      // trigger the redirected request
      switchboard.broadcast('reception', 'holdingbay.' + req.bay_id(), {
        action:'branch',
        location:location,
        request:req.toJSON()
      })
    }

    next();
  })

  /*
  // hook up entry logging
  warehouse.usebefore(function(req, res, next){

    switchboard.broadcast('admin', warehouse.id, {
      action:'request',
      node_id:node.stackpath,
      request:req.toJSON()
    })

    next();
  })
  */

  return warehouse;
}