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

var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    selector_parser = require('./selector'),
    async = require('async');
    
/*
  Quarry.io Container
  -------------------

  Gives a standard container for raw JSON data returned by suppliers

  Each container is actually a wrapper for an array of actual entities (like jQuery)

  This is the base wrapper class for all QuarryDB data throughout the system

 */



/***********************************************************************************
 ***********************************************************************************
  Here is the  data structure:

  {
    
    name:"Bob",
    price:100,

    // this holds the flat value if that what it is
    _primitive:10,

    // the meta data storage
    _meta:{
      id:'bob',
      tagname:'product',
      classnames:{
        red:true,
        blue:true
      }
    },

    // the array of child container values
    _children:[

      ...

    ]


  }

 */


exports = module.exports = factory;

/*
 * Container
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Here is the actual container code
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

// make me a new container please - here is some data!
function factory(data, warehouse){

  // ensure the data layout
  data = ensureContainerObject(data);

  // the container itself acts as a search function
  // this will be overriden by suppliers
  // the default is the in-memory strategy
  var container = function(){}

  // allow the container to emit events
  container = _.extend(container, EventEmitter.prototype);

  // the array of routing that we need to get the container back
  // to where it came from
  var pointer = [];

  /*
   * System
   ****************************************************************
   *
   * Access the warehouse that produced this container
   *
   *
   ***************************************************************
   */

  container.warehouse = function(){
    return warehouse;
  }

  /*
   * Loading
   ****************************************************************
   *
   * This code is about getting containers loaded remotely or locally
   *
   *
   ***************************************************************
   */

  // connect to our warehouse and ask for data remotely
  container.ship = function(selector, context){

    return warehouse._ship_for_container(container, selector, context);
    
  }

  // apply selector to the local (in-memory) data within this container
  container.find = function(selector, context){

    return warehouse._find_for_container(container, selector, context);
    
  }

  /*
   * Children
   ****************************************************************
   *
   * The list of direct children & ancestors
   *
   *
   ***************************************************************
   */

  // return an array of raw objects
  container.rawDescendents = function(){
    var ret = data._children || [];

    _.each(data._children, function(child){
      ret = ret.concat(raw_descendents(child));
    })

    return ret;
  }

  // loop the children with a callback
  container.each = function(callback){
    _.each(this.children(), callback);

    return container;
  }

  // access to the child list of containers
  container.children = function(){
    return _.map(data._children, function(rawChild){
      return factory(rawChild, warehouse);
    })
  }

  // recursive version of children
  container.descendents = function(){
    var descendents = this.children();

    _.each(descendents, function(descendent){
      descendents = descendents.concat(descendent.descendents());
    })

    return descendents;
  }

  // add a child onto the end
  container.append = function(child){
    data._children.push(child.raw());
    return container;
  }

  // return a child by index
  container.at = function(index){
    return factory(data[index], warehouse);
  }

  /*
   * Data
   ****************************************************************
   *
   * Access to the raw underlying data
   *
   *
   ***************************************************************
   */

  // gets the primitive out of the object
  container.raw = function(){
    return data._primitive ? data._primitive : data;
  }

  // the main data accessor
  container.attr = function(field, val){
    if(arguments.length<=0){
      return stripAttr(container.raw());
    }

    // if it's primitive this can only be update the value
    if(data._primitive){
      data._primitive = field;
    }
    else{
      // this is update a value of the object
      if(arguments.length==2){
        data[field] = val;
      }
      // this is get a value of the object or update using an object
      else{
        // update by an object
        if(_.isObject(field)){
          data = _.extend(data, field);
        }
        // get a single field
        else{
          return data[field];
        }
      }
    }

    return container;
  }

  return container;
}

/*
 * Helpers
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Functions used to setup containers
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

/*
  Make sure a container object has the fields like _meta and _children
 */
function defaultContainerObject(rawContainer){
  rawContainer || (rawContainer = {});
  rawContainer._meta || (rawContainer._meta = {});
  rawContainer._children || (rawContainer._children = []);
  return rawContainer;
}

/*
  Turn a given value into a proper container object
 */
function ensureContainerObject(data){
  // the passed in data is a list of children
  if(_.isArray(data)){
    return defaultContainerObject({
      _children:data
    })
  }
  // in this case the data is a normal quarry object
  else if(_.isObject(data)){
    return defaultContainerObject(data);
  }
  // in this case the data is a flat value not a structure
  else{
    return defaultContainerObject({
      _primitive:data
    })
  }
}

// removes the _meta, _children
function stripAttr(attr){

  if(!_.isObject(attr)){
    return attr;
  }

  attr = _.extend({}, attr);

  delete(attr._children);
  delete(attr._meta);

  return attr;
}