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
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    utils = require('./utils'),
    containerFactory = require('./container'),
    ramSupplier = require('./supplier/ram');

    
    
/*
  Quarry.io Warehouse
  -------------------

  The warehouse becomes a proxy to some sort of supplier so you can run CSS and get data back.

  So - if I create a new warehouse pointing to a .json file:

    var warehouse = quarryio.warehouse({
      type:'json_file',
      file:__dirname + '/test.json'
    })

  I can now make new containers and save them to the warehouse:

    quarryio.new('product', {
      name:'Chair',
      price:145
    })
    .addClass('onsale')
    .appendTo(warehouse);

  Now I can run a CSS to the warehouse it will load from it's base supplier:

    warehouse('product').ship(function(results){
      // we have a top-level container with results

    })

  Here is get's interesting - because it is a warehouse, I can specify a 'supplier'
  _meta entry.

  If I then pass a selector with a context to a warehouse - the following steps occur:

    1. The context is run against the base supplier (in this case a json_file)

    2. The results from the context are run through a filter function

    3. The filter function maps anything with a 'supplier' config into a trigger function

    4. When the warehouse runs the selector against the context results - the suppliers will have their
       trigger functions run

    5. This is how the cascading database loading of the warehouse works


 */

/***********************************************************************************
 ***********************************************************************************
  Here is the usage (from node.js):

	// make a new warehouse with the given config
  var $quarry = quarryio.warehouse({
		...
  })

  // now the $quarry is like a root container find function
  $quarry('product.onsale[price<100]').each(function(result_container){
	
  })

	$quarry('product.onsale[price<100]').ship(function(results_container){
	
  })

 */

exports = module.exports = factory;

/**
 * A warehouse is a ROOT level container with a supplier function mapped to the 'ship' method
 *
 * @api public
 */

function factory(options){

  // assign the default to be a RAM supplier
  var supplier = ramSupplier();

  // the main entry point function
  var warehouse = function(context, selector){


  }
  
  // event emitter
  warehouse = _.extend(warehouse, EventEmitter.prototype);

  // public access to the options
  warehouse.options = options;

  // the default stance is ready because our root supplier is RAM
  var ready = true;

  // if this gets filled we must run it once setup
  var user_ready_function = null;

  // assign the id to the warehouse
  warehouse.id = utils.quarryid();

  /*
    User defined ready callback
  */
  warehouse.ready = function(readyCallback){
    ready ? readyCallback && readyCallback(warehouse) : user_ready_function = readyCallback;
    return this;
  }

  /*
    Use the provided root supplier function
  */
  warehouse.supply = function(user_supplier){
    ready = false;

    supplier = user_supplier;

    // tell the root supplier that when it is ready to call the warehouse ready
    // we wrap it in a delay so that the ready of the warehouse can be registered
    supplier.ready(function(){
      async.nextTick(function(){

        // trigger the ready function for the warehouse
        user_ready_function && user_ready_function(warehouse);
      })
    })

    return this;
  }
  
  /*
    Make a new container that is bound to this warehouse
  */
  warehouse.factory = function(tagname, data){

    if(!data){
      data = tagname;
      tagname = null;
    }

    // auto-assign the tagname
    if(tagname && _.isObject(data)){
      data._meta || (data._meta = {})
      data._meta.tagname = tagname
    }

    return containerFactory(data, warehouse);

  }

  /*
    Search for containers in the root supplier
  */
  warehouse.ship = function(selector, context){
    var promise = promiseFactory(warehouse);

    return promise;
  }

  /*
    Map to search (this is a warehouse it's the root level no in-memory)
  */
  warehouse.select = warehouse.ship;

  /*
    Trigger a ROOT supplier contract on behalf of a container
  */
  warehouse._ship_for_container = function(container, selector, context){

  }

  /*
    Trigger a RAM supplier contract on behalf of a container
  */
  warehouse._select_for_container = function(container, selector, context){
    
  }

  
  return warehouse;
}

/*
 * 
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Helpers for the promises and underscore mapping of children
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

/*
 * 
 ****************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 *
 * Helpers for the promises and underscore mapping of children
 *
 *
 ***************************************************************
 ****************************************************************
 ****************************************************************
 ****************************************************************
 */

// create a new 'holding-place' for when the data is loaded
function promiseFactory(warehouse){

  // the callback stack of functions
  var stack = [];

  // the data holding place
  var data = [];

  // have we got our data yet?
  var ready = false;

  // the holding function providing 'each' and 'when'
  // by running the function you are triggering it with data
  var promise = function(raw_data_array){
    this.set_data(raw_data_array);
  }

  // trigger the promise off with some data
  promise.set_data = function(raw_data_array){
    data = raw_data_array;
   
    clearStack();
  }

  // loop the raw data and pass each result as a container
  promise.each = function(callback){
    stack.push(function(raw_data_array){
      _.each(raw_data_array, function(raw_data){
        var container = factory(raw_data, warehouse);
        callback && callback.apply(promise, [container]);
      })
    })

    ready && clearStack();

    return promise;
  }

  // pass a top level container with the results as children
  promise.when = function(callback){
    stack.push(function(raw_data){
      callback && callback.apply(promise, [factory(raw_data_array)]);
    })

    ready && clearStack();

    return promise;
  }

  // run all of the callbacks we have stacked up
  function clearStack(){
    _.each(stack, function(stack_function){
      stack_function.apply(promise, [data])
    })
    stack = [];
    ready = true;
  }
  
  return promise;
}