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

var Mounts = Backbone.Collection.extend({

})

var Node = module.exports = BackboneDeep.extend({
  initialize:function(){
    this.set('stackpath', this.get('path').replace(/\/(index|quarry)?\.\w+$/, '/'));
    this.set('mountpoint', '/' + this.get('stackpath').replace(/\/$/, '').split('/').pop());
    this.mounts = new Mounts(this.get('mounts'));
  },

  assign_instance:function(instance){
    this.set('instance', instance.toJSON());
  },

  recurse:function(fn){
    fn(this);
    this.mounts.each(function(mount){
      mount.recurse(fn);
    })
  },

  toJSON:function(){
    var ret = BackboneDeep.prototype.toJSON.call(this);
    ret.mounts = this.mounts.toJSON();
    return ret;
  },

  mount:function(node){
    this.mounts.add(node);
    return this;
  },

  /*

    Load the code for this node either from the .js file or bootstrap from the .json

   */
  load:function(){
    if(this.get('ext')=='js'){
      this.load_from_js();
    }
    else{
      this.load_from_json();
    }
  },

  load_from_json:function(){
    var node_class = require('../warehouse/' + options.type);
    this.handle = node_class(options);
  },

  load_from_js:function(){
    var node_class = require(filename);
    this.handle = node_class(options);
  }
})