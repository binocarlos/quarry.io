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
var Node = require('../stack/node');

/*
  Quarry.io - Deployment
  ----------------------

  This is one worker having been allocated out to a server and
  with all the settings it needs to be booted and have a network
  client to speak to the rest of it


 */


var Deployment = module.exports = BackboneDeep.extend({
  idAttribute:'allocation_id',
  initialize:function(){
    this._node = new Node(this.get('node'));
  },

  node:function(){
    return this._node;
  },

  allocation:function(){
    var allocations = this.get('allocations') || {};
    return allocations[this.get('allocation_id')];
  },

  toJSON:function(){
    var ret = _.clone(this.attributes);
    ret.node = this._node.toJSON();
    return ret;
  }
})