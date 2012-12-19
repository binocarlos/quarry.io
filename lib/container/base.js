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

  It splits the attr, meta and children into their own models

  The meta and attr and children(collection) classes are defined by the warehouse and always
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

    this.attr = new this.attrmodel(this.get('attr'));
    this.children = new this.child_collection(this.get('children'));

    _.each(this.getChildren(), function(child_model){
      child_model.parent = this;
    })

    this.ensureid();
  },

  toJSON:function(){
    return {
      attr:this.attr.toJSON(),
      meta:this.get('meta') || {},
      route:this.get('route') || {},
      children:this.children.toJSON()
    }
  },

  hasClass:function(classname){
    var classnames = this.get('meta.classnames') || [];
    return _.indexOf(classnames, classname)!=-1;
  },

  addClass:function(classname){
    var classnames = this.get('meta.classnames') || [];
    classnames.push(classname);
    this.set('meta.classnames', _.unique(classnames));
    return this;
  },

  removeClass:function(classname){
    var classnames = this.get('meta.classnames') || [];
    this.set('meta.classnames', _.without(classnames, classname));
    return this;
  },

  getParent:function(){
    return this.parent;
  },

  getChildren:function(){
    return this.children.models;
  },

  // insert an array of models into the children collection
  append:function(models){
    var self = this;
    _.each(models, function(model){
      model.parent = self;
      model.ensureRoute(self.get('route'));
      self.children.add(model);
    })
    return this;
  },

  removeChild:function(model){
    this.children.remove(model);
  },

  remove:function(models){
    this.children.remove(models);
  },

  assignModel:function(attr_model){
    this.attr = attr_model;
    return this;
  },

  // make sure the model has an id - full means we are about to actually save it into a database
  ensureid:function(forsaving){
    if(this.issaved()){
      return this;
    }
    else if(forsaving){
      this.set('meta.quarryid', utils.quarryid());
    }
    else{
      this.set('meta.quarryid', utils.quarryid(true));
    }
    return this;
  },

  // do we have a full quarryid or a temporary one
  issaved:function(){
    return this.has('meta.quarryid') && this.get('meta.quarryid').length>8;
  },

  /*

    an object representing the route for this container
      hostname
      path
      id
      quarry.io/ramfile/bob1/23
  
    recursivly add the route into the tree of models

   */
  setRoute:function(route){
    // we already have a route
    if(!route || this.get('route')){
      return;
    }
    this.ensureRoute(route);
  },

  /*

    pointer_mode means we want the pointer if present (which branches)
    this is for append / select commands
    save / delete commands use the standard route (i.e. the pointer entry)

   */
  getRoute:function(pointer_mode){

    var pointer = this.getPointer();

    // if it's below we might be branching otherwise it's the route stamped by the supplier
    return pointer_mode && pointer ? pointer : this.get('route');
  },

  route:function(){
    return this.getRoute.apply(this, arguments);
  },

  frequency:function(){
    var route = this.getRoute.apply(this, arguments) || '';

    return route.replace(/^\//, '').replace(/\//g, '.');
  },
  
  /*
  
    Provide the route from parent nodes

   */
  ensureRoute:function(route){
    this.set({
      'route':route
    }, {
      silent:true
    })
    _.each(this.getChildren(), function(child){
      child.ensureRoute(route);
    })
  },

  /*

    the pointer overrides the route for descendents
    the route is assigned by the supplier warehouse
    the pointer is baked into the meta and saved
    a container with a pointer represents a branched database living inside another one

   */
  getPointer:function(){
    return this.get('meta.pointer');
  }
})