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

module.exports = loader;


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

function loader(options){
  options || (options = {});

  if(!options.supplychain){
    throw new Error('bootloder needs a supplychain');
  }

  if(!options.switchboard){
    throw new Error('bootloder needs a switchboard');
  }

  if(!options.deployment){
    throw new Error('bootloder needs a deployment');
  }

  /*

    This is the actual warehouse code

    This can be a user supplied function or an auto-loaded (like supplier)

   */
  var deployment = options.deployment;
  var node = deployment.node();
  var allocation = deployment.allocation();
  var allocations = deployment.get('allocations');

  var runner = node.load();
  var warehouse = Warehouse();

  warehouse.prepare(function(ready_callback){

    
    /*


      hook up the request with access to the stack that it needs

     */
    warehouse.inject_switchboard(options.switchboard);

    /*

      This is the main mount of the node's code (supplier, map function etc)


     */
    console.log('-------------------------------------------');
    console.log('mounting warehouse: ' + node.id);
    warehouse.use(runner);


    /*

      
      Next we mount the routes the are below this point

      The main code must have called next to get to here

      This lets the user supplied code act as security or logging middleware
      before any further routes are reached


     */
    _.each(node.get('mountpaths'), function(mount){

      var allocation = allocations[mount.stackpath];

      if(!allocation){
        throw new Error('Allocation not found: ' + mount.stackpath);
      }

      console.log('-------------------------------------------');
      console.log('mounting sub-warehouse: ' + mount.mountpoint + ' -> ' + mount.stackpath);
      var supplychain = options.supplychain(mount.stackpath);

      warehouse.use(mount.mountpoint, supplychain);
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

    ready_callback && ready_callback();
  })

  return warehouse;
}