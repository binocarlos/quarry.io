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

if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['underscore', 'async', 'events', './utils', './selector'], function (_, async, events, utils, selector_parser) {

  var EventEmitter = events.EventEmitter;

    
/*
  Quarry.io Container
  -------------------

  Gives a standard container for raw JSON data returned by suppliers

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

      {...} // a raw container

      OR

      [
          {...} // routing

          [ ... ] // raw children

      ]

    ]


  }

 */


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

  var force_tag = null;

  // we only have a supply chain
  if(_.isFunction(data)){
    supply_chain = data;
    data = {};
  }
  // this is for 'new' containers with no supply chain
  else if(_.isString(data) && _.isObject(supply_chain)){
    force_tag = data;
    data = supply_chain;
    supply_chain = null;
  }

  // ensure the data layout
  data = ensureContainerObject(data);

  if(force_tag){
    data._meta.tagname = force_tag;
  }

  // the base info for a container
  function get_skeleton(){
    return {
      _meta:data._meta,
      _data:data._data
    }
  }

  // a reference to the in-memory parent - this is passed on by descendent functions
  var parent = null;

  // trigger a 'contract' on the supply chain
  function container(selector, context){

    var self = this;

    // make sure the context is a string
    if(_.isFunction(context)){
      context = '=' + context.quarryid();
    }
    else if(_.isObject(context)){
      context = '=' + context._meta.quarryid;
    }

    // return a promise so they can set some options for the query
    // once the promise is triggered - we end up below with a callback
    // to which we pipe a results container
    return promiseFactory(function(promise_options, return_callback){

      // run the actual query through the supply chain
      route_packet(supply_chain, {
        action:'select',
        message:{
          previous:[get_skeleton()],
          selector_string:_.isString(selector) ? selector : null,
          context_string:_.isString(context) ? context : null,
          selector:selector_parser(selector),
          context:selector_parser(context),
          options:promise_options
        }
      }, function(error, packet){

        // turn the results into an answer container
        //
        packet.answer || (packet.answer = {
          ok:true,
          empty:true
        })
        return_callback(factory(packet.answer.results, supply_chain));
        
      })


     
    })

    

    // the quarryroot switch is so we do not pass previous ids if we are selecting from the root
    

  }

  // allow the container to emit events
  container = _.extend(container, EventEmitter.prototype);

  // give the container it's prototype methods
  container = _.extend(container, proto);

  /*
   * Routing
   ****************************************************************
   *
   * The route is where this lives
   *
   * The child route (if set) means append to a different place than route
   *
   *
   ***************************************************************
   */

  /*
    Adds the correct route property to a packet based on the containers route settings
   */
  function route_packet(supply_chain, packet, callback){

    // this container has so supply chain - there is no query, we turn blank
    if(!supply_chain){
      packet.answer = {
        ok:true,
        results:[]
      }
      callback(null, packet);
      return;
    }

    // actions that will ignore if a container has a branch routing (i.e. _meta.route)
    var direct_actions = {
      'save':true,
      'delete':true
    }

    // actions that prioritize a branch routing (i.e. _meta.route)
    var branch_actions = {
      'select':true,
      'append':true
    }

    function action_route(action){
      return direct_actions[action] ?
        (data._data.route) :
        (data._meta.route || data._data.route);
    }

    packet.route = action_route(packet.action);
    
    supply_chain(packet, callback);
  }

  /*
    This is stored in the containers transient data and passed down to descendents
    it says:

    'save / select me from this place'
   */
  function route(val){
    return val ? data._data.route = val : data._data.route;
  }

  /*
    The route for searching / appending to this container
   */
  container.route_packet = function(packet, supply_chain, callback){
    return route_packet(packet, supply_chain, callback);
  }

  /*
    The temporary root set by the containers supply chain
    We pass this down to our descendents
   */
  container.route = function(val){
    return route(val);
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
    callback && callback(container);
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

  container.supply_chain = function(){
    return supply_chain;
  }

  /*
   * Find
   ****************************************************************
   *
   * Direct in memory selector for container descendents
   *
   *
   ***************************************************************
   */

  // the IN MEMORY selector flow - this is always here and hard-coded
  // this is the only method that does not use a stack to resolve selectors
  container.find = function(selector_string){
    var ret = this.find_raw(selector_string);
    return factory(ret, supply_chain);
  }

  /*
   * Save
   ****************************************************************
   *
   * Trigger a save message for this container
   *
   *
   ***************************************************************
   */

  container.save = function(callback){

    // strip the _children and _data from the raw data
    var raw_data = _.clone(data);

    delete(raw_data._children);
    delete(raw_data._data);

    // run the actual query through the supply chain
    route_packet(supply_chain, {
      action:'save',
      message:{
        target:this.skeleton(),
        data:raw_data
      }
    }, function(error, packet){
      this.inject(packet.answer.results);
      callback(error, container);
    })
  }

  /*
    Used to merge the given object into this containers data
   */
  container.merge = function(obj){
    data = _.extend(data, obj);
  }

  /*
    Replace the raw data of the container
   */
  container.inject = function(new_data){
    data = _.extend(data, new_data);
    return this;
  }
  /*
    Returns a cloned version with quarryids replaced
   */
  container.clone = function(){
    return factory(JSON.parse(JSON.stringify(data)));

    // clean up
    var filtered = cloned.raw(function(r){
      //r._meta.quarryid = utils.quarryid();
      delete(r._meta.quarryid);
      delete(r._meta.route);
      delete(r._data);
    })

    return factory(filtered);
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

    var self = this;

    var raw_append = [];

    if(_.isArray(child)){
      raw_append = _.map(child, function(c){
        return _.isFunction(c) ? c.raw() : c;
      })
    }
    else{
      raw_append = [_.isFunction(child) ? child.raw() : child];
    }
    
    var filtered_container = factory(raw_append).clone();

    var filtered_raw_data = filtered_container.raw_children(function(d){
      d._meta.quarryid = utils.quarryid();
      delete(d._meta.route);
      delete(d._data);
      return d;
    })

    raw_append = filtered_raw_data;

    // if we don't have a supply chain we are appending to RAM
    if(!supply_chain){
      // direct injection in RAM
      data._children = data._children.concat(raw_append);
    }
    else{

      // now we want to clone the data and replace quarryids
      //raw_append = factory(raw_append).clone().raw_children();

      // don't send a target if we reckon we are adding to a root container
      var use_target = this.quarryid()=='root' || this.meta('route') ? null : this.skeleton();

      // run the actual query through the supply chain
      route_packet(supply_chain, {
        action:'append',
        message:{
          target:use_target,
          append:raw_append
        }
      }, function(error, packet){

        var results = packet.answer.results;

        var child_array = _.isArray(child) ? child : [child];

        if(!_.isArray(results)){
          results = [results];
        }

        var i = 0;
        _.each(results, function(result){
          var c = child_array[i];
          if(c){
            c.inject(result);
            c.parent(self);
          }
        })

        callback(error);
      });
    }

    return container;
  }

  container.appendTo = function(parent, callback){
    parent.append(this, callback);
  }

  // add a child onto the end
  container.pourInto = function(parent, callback){

    parent.append(this.children(), callback);
    
    return container;
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

   // access to the child list of containers
  container.children = function(){
    var self = this;
    return _.map(data._children, function(rawChild){
      var ret = factory(rawChild, supply_chain);

      // this inherits the route from the parent
      if(!ret.route()){
        ret.route(self.route());  
      }

      ret.parent(self);
      
      return ret;
    })
  }

  container.parent = function(new_parent){
    return new_parent ? parent = new_parent : parent;
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
  container.raw = function(filter){

    if(this.is_primitive()){
      return this.primitive();
    }
    else{
      if(filter){
        function run_filter(raw){
          var ret = _.extend({}, raw);
          ret._children = _.map(ret._children, run_filter);
          ret = filter(ret);
          return ret;
        }
        return run_filter(data);
      }
      else{
        return data;  
      }
    }
  }

  // the main attr accessor
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

  // create a closure for accessing an object
  function pigeonhole(host, obj, field){
    return function(prop, value){
      if(_.isObject(prop)){
        obj[field] = _.extend(obj[field], prop);
        return host;
      }
      else if(arguments.length==2){
        obj[field][prop] = value;
        return host;
      }
      else if(_.isString(prop)){
        return obj[field][prop];
      }
      else{
        return obj[field];
      }
    }
  }

  // the data accessor
  container.data = pigeonhole(container, data, '_data');

  // the meta accessor
  container.meta = pigeonhole(container, data, '_meta');

  return container;
}


/*
 * Prototype
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Parts of container that do not need the closure
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

var proto = {};

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
proto.run_selector_stage = function(selector){

  var search_function = selector_parser.compile(selector);
  // this is the > child or descendent splitter
  var search_array = selector.splitter=='>' ? this.children() : this.descendents();

  // the in-memory parent selector hack
  if(selector.splitter=='<'){
    var parent = this.parent();
    search_array = parent ? [parent] : [];
  }

  return _.filter(search_array, search_function);
}

// run a single selector string in this container
proto.find_raw = function(selector_string){
  var self = this;
  var phases = _.isString(selector_string) ? selector_parser(selector_string) : selector_string;  
  var all_results = [];
  
  _.each(phases, function(selectors){
    var current_results = [self];
    // run each step of the selector in sequence
    _.each(selectors, function(selector){
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
proto.each = function(callback){
  _.each(this.children(), callback);

  return this;
}

// return the first child and run the callback optionally
proto.first = function(callback){
  callback && callback(this.at(0));

  return this.at(0);
}



// recursive version of children
proto.descendents = function(){
  var descendents = this.children();

  _.each(descendents, function(descendent){
    descendents = descendents.concat(descendent.descendents());
  })

  return descendents;
}

/*
  How many children in memory
 */
proto.count = function(){
  return this.children().length;
}

// return a child by index
proto.at = function(index){
  index = arguments.length<=0 ? 0 : index;

  var children = this.children();

  return children[index];
}

// run a function over each descendent
proto.recurse = function(callback){
  var self = this;
  _.each(this.descendents(), function(descendent){
    callback && callback.apply(self, [descendent]);
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

proto.raw_children = function(filter_function){
  return _.map(this.children(), function(child){
    return child.raw(filter_function);
  })
}

proto.dump = function(){
  return JSON.stringify(this.raw(), null, 4);
}

// just _meta and _data
proto.skeleton = function(){
  return {
    _meta:this.meta(),
    _data:this.data()
  }
}

proto.primitive = function(){
  return this.attr('_primitive');
}

proto.is_primitive = function(){
  return this.primitive() != null;
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
proto.match = function(selector_string){
  // this grabs just the first actual seletor - ignores phases & steps
  var selector = selector_parser(selector_string, true);

  var match_function = selector_parser.compile(selector);

  return match_function(this);
}

proto.quarryid = function(val){
  return val ? this.meta('quarryid', '' + val) : this.meta('quarryid');
}

proto.id = function(val){
  return val ? this.meta('id', '' + val) : this.meta('id');
}

proto.tagname = function(val){
  return val ? this.meta('tagname', val) : this.meta('tagname');
}

proto.classnames = function(val){
  return val ? this.meta('classnames', val) : this.meta('classnames');
}

proto.hasClass = function(class_name){
  var existing = this.meta('classnames');
  return existing && existing[class_name];
}

proto.addClass = function(class_name){
  this.meta('classnames') || (this.meta('classnames', {}))
  var existing = this.meta('classnames');
  existing[class_name] = true;
  this.meta('classnames', existing);
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
proto.create = function(tagname, data){

  if(!data){
    data = tagname;
    tagname = null;
  }

  var ret = factory(data);

  tagname && ret.tagname(tagname);

  return ret;
}

proto.toString = function(){
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

// return JSON formatted raw
proto.pretty = function(){
  return JSON.stringify(this.raw(), null, 4);
}

/*
 * 
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Query Factory - this is the promise returned when you run the 
 * container selector function
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

// create a new 'holding-place' for when the data is loaded
function promiseFactory(trigger_callback){
  

  // the data holding place
  var result_container = null;

  var started = false;
  var ready = false;

  var stack = [];

  // things like limit etc
  var options = {};

  // the holding function providing 'each' and 'when'
  var promise = function(){
    
  }

  // trigger the promise off with some data
  function trigger(){
    // only do once
    if(started){
      return;
    }

    started = true;

    // pass the options and the 'we have loaded a container' callback
    trigger_callback(options, function(result){
      result_container = result;

      clearStack();
    });
  }

  // add a promise callback to the stack
  function addStack(callback){
    stack.push(callback);

    // we have already done this query
    if(ready){
      clearStack();
    }
    else{
      trigger();
    }
    
    return promise;
  }

  // run all of the callbacks we have stacked up
  function clearStack(){
    _.each(stack, function(stack_function){
      stack_function.apply(promise, [result_container])
    })
    stack = [];
    ready = true;
  }

  // loop the raw data and pass each result as a container
  promise.each = function(callback){
    return addStack(function(result_container){
      result_container.each(callback);
    })

    
  }

  // limit the query to one result and trigger an each
  promise.first = function(callback){
    return addStack(function(result_container){
      result_container.first(callback);
    })
  }

  // 

  // pass a top level container with the results as children
  promise.when = function(callback){
    return addStack(function(result_container){
      callback && callback.apply(promise, [result_container]);
    })
  }

  // alias
  promise.ship = promise.when;

  return promise;
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

return factory;

})