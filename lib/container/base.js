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

var BackboneDeep = require('../vendor/backbonedeep');
var Backbone = require('../vendor/backbone');
var _ = require('underscore');
var utils = require('../utils');
var eyes = require('eyes');

/*
  Quarry.io - Container Model Wrapper
  -----------------------------------

  Represents the data for one model

  It splits the _attr, _meta and _children into their own models

  The _meta and _attr and _children(collection) classes are defined by the warehouse and always
  passed into the wrapper constructor

 */

module.exports = BackboneDeep.extend({

  // the default attrmodel
  attrmodel:BackboneDeep.extend(),

  // differentiate between a basic attr model and the wrapper layer
  _is_quarry_wrapper:true,

  initialize:function(){

    this.child_collection = Backbone.Collection.extend({
      model:this.constructor
    })

    this.attr = new this.attrmodel(this.get('_attr'));
    this.children = new this.child_collection(this.get('_children'));

    this.ensureid();
  },

  assignModel:function(attr_model){
    this.attr = attr_model;
    return this;
  },

  toJSON:function(){
    return {
      _attr:this.attr.toJSON(),
      _meta:this.get('_meta') || {},
      _route:this.get('_route') || {},
      _children:this.children.toJSON()
    }
  },

  // make sure the model has an id - full means we are about to actually save it into a database
  ensureid:function(full){
    if(this.issaved()){
      return this;
    }
    else if(full){
      this.set('_meta.quarryid', utils.quarryid());
    }
    else{
      this.set('_meta.quarryid', utils.quarryid(true));
    }
  },

  // do we have a full quarryid or a temporary one
  issaved:function(){
    return this.has('_meta.quarryid') && this.get('_meta.quarryid').match(/-/);
  }
})