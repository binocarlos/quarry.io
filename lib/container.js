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
    utils = require('./utils'),
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

// make me a new container please - here is some data and the originating warehouse!
function factory(data, supply_chain){

  // we only have a supply chain
  if(_.isFunction(data)){
    supply_chain = data;
    data = {};
  }

  // ensure the data layout
  data = ensureContainerObject(data);

  // trigger a 'contract' on the supply chain
  var container = function(selector, context){

    // create the query that will be returned immediately
    // it has everything to perform the load
    return queryFactory(supply_chain, selector, context);

  }

  // allow the container to emit events
  container = _.extend(container, EventEmitter.prototype);

  // the options as per 'configure'
  var options = {};

  /*
   * Configure
   ****************************************************************
   *
   * Sets the options
   *
   *
   ***************************************************************
   */

  container.option = function(prop, value){
    if(_.isObject(prop)){
      options = _.extend(options, prop);
      return container;
    }
    else if(arguments.length==2){
      options[prop] = value;
      return container;
    }
    else if(_.isString(prop)){
      return options[prop];
    }
    else{
      return options;
    }
  }

  /*
   * Ready
   ****************************************************************
   *
   * callback
   *
   *
   ***************************************************************
   */

  /*
    chaining ready trigger
  */
  container.ready = function(callback){
    if(supply_chain && supply_chain.ready){
      supply_chain.ready(function(){
        callback && callback(container)  
      })
    }
    else{
      callback(container);
    }

    return this;
  }

  /*
   * Supply Chain
   ****************************************************************
   *
   * The supply chain a container uses defines its driver
   *
   *
   ***************************************************************
   */

  container.supply_chain = function(new_chain){
    return new_chain ? supply_chain = new_chain : supply_chain;
  }

  /*
   * Pointers
   ****************************************************************
   *
   * How containers find their way back home
   * An array of ids - each step the container passes through adds to the array
   *
   *
   ***************************************************************
   */


  container.pointer = function(val){
    return arguments.length<=0 ? this.data('pointer') : this.data('pointer', val);
  }

  /*
   * Structure
   ****************************************************************
   *
   * Modifying the database structure
   *
   *
   ***************************************************************
   */

  // add a child onto the end
  container.append = function(child, callback){
    if(!this.readOnly()){
      data._children.push(child.raw());  
    }

    supply_chain && supply_chain({
      pointer:container.pointer(),
      action:'append',
      message:{
        parent:container.quarryid(),
        child:child.raw()
      }
    }, callback)

    return container;
  }

  /*
   * Loading
   ****************************************************************
   *
   * In memory for a container
   *
   *
   ***************************************************************
   */

  // run a single selector step
  container.run_selector_stage = function(selector){

    var search_function = selector_parser.compile(selector);
    // this is the > child or descendent splitter
    var search_array = selector.splitter=='>' ? this.children() : this.descendents();

    return _.filter(search_array, search_function);
  }

  // run a single selector string in this container
  container.find_raw = function(selector_string){
    var phases = _.isString(selector_string) ? selector_parser(selector_string) : selector_string;

    var all_results = [];
    // run each phase of the selector is parallel
    _.each(phases, function(selectors){
      var current_results = [container];
      // run each step of the selector in sequence
      _.each(selectors, function(selector){
        
    //console.dir(container.raw());
        var search_results = [];
        _.each(current_results, function(current_result){
          search_results = search_results.concat(current_result.run_selector_stage(selector));
        })
        current_results = search_results;
      })
      all_results = all_results.concat(current_results);
    })

    return _.map(all_results, function(result){
      return result.raw();
    })
  }

  // the IN MEMORY selector flow - this is always here and hard-coded
  // this is the only method that does not use a stack to resolve selectors
  container.find = function(selector_string){
    return factory(container.find_raw(selector_string), supply_chain);
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

  // loop the children with a callback
  container.each = function(callback){
    _.each(this.children(), callback);

    return container;
  }

  // access to the child list of containers
  container.children = function(){
    return _.map(data._children, function(rawChild){
      return factory(rawChild, supply_chain);
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

  // return a child by index
  container.at = function(index){
    return factory(data[index], supply_chain);
  }

  // run a function over each descendent
  container.recurse = function(callback){
    _.each(this.descendents(), function(descendent){
      callback && callback.apply(container, [descendent]);
    })
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
  // if its an object then we recurse and pass the filter through
  container.raw = function(filter_function){
    if(data._primitive){
      return data._primitive;
    }
    else{
      function process_raw_data(raw_data){

        var new_children = _.map(raw_data._children, function(child_data){
          return process_raw_data(child_data);
        })

        var ret = _.extend({}, raw_data);

        ret._children = new_children;
        
        return filter_function ? filter_function(ret) : ret;
      }

      return process_raw_data(data);
    }
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

  container.data = function(prop, value){
    if(_.isObject(prop)){
      data._data = _.extend(data._data, prop);
      return container;
    }
    else if(arguments.length==2){
      data._data[prop] = value;
      return container;
    }
    else if(_.isString(prop)){
      return data._data[prop];
    }
    else{
      return data._data;
    }
  }

  // the meta accessor
  container.meta = function(prop, val){

    if(arguments.length==0){
      return data._meta;  
    }
    else if(arguments.length==1){
      return data._meta[prop];
    }
    else if(arguments.length==2){
      data._meta[prop] = val;
      return this;
    }
    
  }

  /*
   * CSS Properties
   ****************************************************************
   *
   * Access to classnames and quarryids etc
   *
   *
   ***************************************************************
   */

   /*
    Truth test against a selector string
   */
  container.match = function(selector_string){
    // this grabs just the first actual seletor - ignores phases & steps
    var selector = selector_parser(selector_string, true);

    var match_function = selector_parser.compile(selector);

    return match_function(container);
  }

  container.quarryid = function(val){
    if(val){
      data._meta.quarryid = val;
      return this;
    }
    else{
      return data._meta.quarryid; 
    }
  }

  container.id = function(val){
    if(val){
      data._meta.id = val;
      return this;
    }
    else{
      return data._meta.id; 
    }
  }

  container.tagname = function(val){
    if(val){
      data._meta.tagname = val;
      return this;
    }
    else{
      return data._meta.tagname; 
    }
  }

  container.classnames = function(val){
    if(val){
      data._meta.classnames = val
      return this;
    }
    else{
      return data._meta.classnames; 
    }    
  }

  container.hasClass = function(class_name){
    return data._meta.classnames && data._meta.classnames[class_name];
  }

  container.addClass = function(class_name){
    data._meta.classnames || (data._meta.classnames = {})
    data._meta.classnames[class_name] = true;
    return this;
  }

  /*
   * Helper Properties
   ****************************************************************
   *
   * Methods as per-configure settings
   *
   *
   ***************************************************************
   */

  /*
    Make a new container
  */
  container.create = function(tagname, data){

    if(!data){
      data = tagname;
      tagname = null;
    }

    var ret = factory(data);

    tagname && ret.tagname(tagname);

    return ret;
  }

  /*
    How many children in memory
   */
  container.count = function(){
    return this.children().length;
  }

  // stop things being added in-memory (for)
  container.readOnly = function(val){
    return arguments.length==1 ? options.readOnly = val : options.readOnly;
  }

  container.toString = function(){
    var parts = [
      
    ];

    if(this.tagname()){
      parts.push(this.tagname());
    }

    if(this.id()){
      parts.push('#' + this.id())
    }

    if(_.keys(this.classnames() || {}).length>0){
      parts.push(_.map(_.keys(this.classnames()), function(classname){
        return '.' + classname;
      }).join(''));
    }

    var st = parts.join('');

    if(this.attr('name')){
      st = this.attr('name') + ': ' + st;
    }

    if(st.length<=0){
      st = 'container';
    }
    return st;
  }

  return container;
}

/*
 * 
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Query Factory
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

// create a new 'holding-place' for when the data is loaded
function queryFactory(supply_chain, selector, context){

  // the data holding place
  var result_container = null;

  var started = false;
  var ready = false;

  var stack = [];

  // the holding function providing 'each' and 'when'
  var query = function(){
    
  }

  query.selector = selector;
  query.context = context;

  // trigger the promise off with some data
  function trigger(){

    // only do once
    if(started){
      return;
    }

    started = true;

    // make sure the context is a string
    if(_.isFunction(selector)){
      selector = '=' + selector.quarryid();
    }
    else if(_.isObject(selector)){
      selector = '=' + selector._meta.quarryid;
    }

    function results_callback(error, res){
      result_container = factory(res.results, supply_chain);

      clearStack();
    }

    if(!supply_chain){
      results_callback(null, []);
      return;
    }
    // if we have a context we want the raw results for it first
    if(context){

      // use the filtered context results to trigger the selector on them
      supply_chain({
        action:'contract',
        message:{
          selector:selector_parser(selector),
          context:selector_parser(context)  
        }
      }, results_callback);
    }
    else{
      // use the filtered context results to trigger the selector on them
      supply_chain({
        action:'select',
        message:{
          selector:selector_parser(selector)  
        }
      }, results_callback);
    }
  }

  // loop the raw data and pass each result as a container
  query.each = function(callback){
    stack.push(function(result_container){
      result_container.each(callback);
    })

    // we have already done this query
    if(ready){
      clearStack();
    }
    else{
      trigger();
    }
    
    return query;
  }

  // pass a top level container with the results as children
  query.when = function(callback){
    stack.push(function(result_container){
      callback && callback.apply(query, [result_container]);
    })

    if(ready){
      clearStack();
    }
    else{
      trigger();
    }

    return query;
  }

  // run all of the callbacks we have stacked up
  function clearStack(){
    _.each(stack, function(stack_function){
      stack_function.apply(query, [result_container])
    })
    stack = [];
    ready = true;
  }
  
  return query;
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
  rawContainer._data || (rawContainer._data = {});
  rawContainer._meta.quarryid || (rawContainer._meta.quarryid = utils.quarryid());
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
  else if(_.isFunction(data) || _.isUndefined(data)){
    return defaultContainerObject({
      
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

// removes the _meta, _children & _data props
function stripAttr(attr){

  if(!_.isObject(attr)){
    return attr;
  }

  attr = _.extend({}, attr);

  delete(attr._children);
  delete(attr._meta);
  delete(attr._data);

  return attr;
}