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
var eyes = require('eyes');
var BackboneDeep = require('../vendor/backbonedeep');
var utils = require('../utils');
var Backbone = require('../vendor/backbone');

/*
  Quarry.io - Node.js : )
  -----------------------

  A node represents a single middleware function in the global
  warehouse routing tree

  A node will have a path - this is the relative mount-point to the
  parent warehouse

  A node also has a route - this is the absolute path to the reception
  warehouse and is used to stamp responses on their way out


  A node can exist in several places in different ways.

  It can be booted - this means this object represents the actual node
  running on the network.

  It can be routed - this means this object represents a supplychain
  to where this node actually runs



 */

var Node = module.exports = BackboneDeep.extend({
  initialize:function(){
    var stackpath = this.get('path').replace(/\/$/, '');

    stackpath = stackpath.replace(/\.\w+$/, '');
    stackpath = stackpath.replace(/\/(index|quarry)$/, '');
    stackpath = stackpath + '/';

    this.set('stackpath', stackpath);
    this.set('mountpoint', ('/' + this.get('stackpath').replace(/\/$/, '').split('/').pop() + '/').replace(/\/\/$/, '/'));
    this.mounts = _.each(this.get('mounts'), function(mountdata){
      return new Node(mountdata);
    }) || []

    this.id = this.get('stackpath');
    this.set('route', {
      hostname:this.get('stackid'),
      path:this.id
    })
  },

  recurse:function(fn){
    _.each(this.mounts, function(mount){
      mount.recurse(fn);
    })
    fn(this);
  },

  // flat means turn the mounts just into an array of strings
  toJSON:function(flat){
    var ret = BackboneDeep.prototype.toJSON.call(this);
    ret.mounts = _.map(this.mounts, function(mount){
      return !flat ? mount.toJSON() : {
        mountpoint:mount.get('mountpoint'),
        stackpath:mount.get('stackpath')
      }
    })
    return ret;
  },

  mount:function(node){
    this.mounts.push(node);
    return this;
  }

})