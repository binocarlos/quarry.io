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
    async = require('async');
    
/*
  Quarry.io Container
  -------------------

  Gives a standard container for raw JSON data returned by suppliers

  Each container is actually a wrapper for an array of actual entities (like jQuery)

  This is the base wrapper class for all QuarryDB data throughout the system

 */

// accepts a host and array of objects
// each underscore method called on the host will be trigged on the objects
function mapUnderscore(host, arr){

  // underscore methods that will return the raw underlying data
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  _.each(methods, function(method) {
    host[method] = function() {
      return factory(_[method].apply(_, [arr].concat(_.toArray(arguments))));
    };
  });

  // Mix in each Underscore method as a proxy to arr
  _.each(methods, function(method) {
    host[method] = function(){

      var allContainers = _.map(arr, function(raw){
        return factory(raw);
      })

      return factory({
        _children:_.map(_[method].apply(_, [allContainers].concat(_.toArray(arguments))), function(result){
          return result.raw();
        })
      })
    }
  })
}

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
function process_attr(attr){

  if(!_.isObject(attr)){
    return attr;
  }

  attr = _.extend({}, attr);

  delete(attr._children);
  delete(attr._meta);

  return attr;
}

// make me a new container please - here is some data!
function factory(data){

  var container = _.extend(function(){}, EventEmitter.prototype);

  data = ensureContainerObject(data);

  // we want each underscore method mapped onto the value
  // we coerce the value into an array if it is not one
  mapUnderscore(container, data._children);

  // access to the child list of containers
  container.children = function(){
    return _.map(data._children, function(rawChild){
      return factory(rawChild);
    })
  }
  // gets the primitive out of the object
  container.raw = function(){
    return container.is_primitive() ? data._primitive : data;
  }

  // is this container for an object or flat primitive value?
  container.is_primitive = function(){
    return data._primitive ? true : false;
  }

  // the main data accessor
  container.attr = function(field, val){
    if(arguments.length<=0){
      return process_attr(container.raw());
    }

    // if it's primitive this can only be update the value
    if(container.is_primitive()){
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

  // return a child by index
  container.at = function(index){
    return factory(data[index]);
  }

  return container;
}

exports = module.exports = factory;
