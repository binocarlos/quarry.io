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
    ramSupplyChain = require('./supply_chain/ram'),
    selectorFactory = require('./selector'),
    containerFactory = require('./container');


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

function factory(supply_chain){
  
  supply_chain || (supply_chain = ramSupplyChain());

  // the root warehouse function - this is the main entry point
  // you pass in selector and context (can be container)
  // it gives back a promise providing 'each' and 'when'
  var warehouse = function(selector, context){

    // create the promise that will be returned immediately
    var promise = promiseFactory(supply_chain);

    // make sure the context is a string
    if(_.isFunction(selector)){
      selector = '=' + selector.quarryid();
    }
    else if(_.isObject(selector)){
      selector = '=' + selector._meta.quarryid;
    }

    function results_callback(error, res){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('RAW Context RESULTS');
      console.dir(raw_results);
    }

    // if we have a context we want the raw results for it first
    if(context){

      // use the filtered context results to trigger the selector on them
      supply_chain({
        action:'contract',
        selector:selectorFactory(selector),
        context:selectorFactory(context)
      }, results_callback);
    }
    else{
      // use the filtered context results to trigger the selector on them
      supply_chain({
        action:'select',
        selector:selectorFactory(selector)
      }, results_callback);
    }

    return promise;
  }

  // turn the warehouse into a container
  warehouse = containerFactory(warehouse, supply_chain);

  // we are read_only if we have a custom supply_chain
  warehouse.readOnly(arguments.length>0);

  // a function to make a container with the correct pointer
  function container_factory(data){
    var container = containerFactory(res, supply_chain);
  }

  // used to pass the selector down the supply chain
  // when then map our warehouse id into the pointer for each result
  function run_selector(options, loaded_callback){

    options || (options = {});

    var use_supply_chain = options.supply_chain || supply_chain;

    var selector = options.selector;

    

  }

  // the function that is run as the entry point
  function entry(selector, context){
    var self = warehouse;

    console.log('test');
    console.dir(selector);
    console.dir(context);
    

    
    

    //promise.keep(containerFactory(res, supply_chain));

    return promise;
  }

  function context_selector(selector, loaded_callback){
    run_selector({
      selector:selector
    }, function(error, res){

      // a holding place for the containers ready for the middleware
      var containers_in = containerFactory(res.results, supply_chain);

      // an array of the containers that have branched
      var branched_ids = [];

      // get the branched supply chains
      var use_branches = warehouse.get_branches(containers_in, function(branched_container){
        branched_ids.push(branched_container.quarryid());
      })

      console.log('-------------------------------------------');
      console.dir(branches);
      branched_ids = _.uniq(branched_ids);

      console.dir(branched_ids);

    })
  }
  
  /*
    Return a map of branches with matching containers from the given root container
  */
  warehouse.get_branches = function(top_container, filter_function){

    var ret = [];

    _.each(branches, function(branch){
      // we look for any containers matching the branch selector
      top_container.find(branch.selector).each(function(branch_result){
        branch.loader.apply(warehouse, [branch_result, function(use_supply_chain){
          if(use_supply_chain){
            filter_function && filter_function(branch_result); 
            ret.push(use_supply_chain)
          }
        }])
      })
    })

    return ret;
  }

  /*
    Pipe the message through to the supply chain
  */
  warehouse.supply = function(message, callback_function){
    supply_chain(message, callback_function);
    return this;
  }

  /*
    Use this function to branch into alternative context loaders for matching context results
  */
  warehouse.branch = function(selector, loader_function){
    branches.push({
      selector:selector,
      loader:loader_function
    })
    return this;
  }

  /*
    Make a new container
  */
  warehouse.create = function(tagname, data){

    if(!data){
      data = tagname;
      tagname = null;
    }

    var ret = containerFactory(data);

    tagname && ret.tagname(tagname);

    return ret;
  }

  /*
    chaining ready trigger
  */
  warehouse.ready = function(callback){
    supply_chain.ready ? 
      supply_chain.ready(function(){
        callback && callback(warehouse)  
      }) :
      callback && callback(warehouse)
    return this;
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
function promiseFactory(supply_chain){

  // the callback stack of functions
  var stack = [];

  // the data holding place
  var result_container = null;

  // have we got our data yet?
  var ready = false;

  // the holding function providing 'each' and 'when'
  var promise = function(){
    
  }

  // trigger the promise off with some data
  promise.keep = function(result){
    result_container = result;
   
    clearStack();
  }

  // loop the raw data and pass each result as a container
  promise.each = function(callback){
    stack.push(function(result_container){
      result_container.each(callback);
    })

    ready && clearStack();

    return promise;
  }

  // pass a top level container with the results as children
  promise.when = function(callback){
    stack.push(function(result_container){
      callback && callback.apply(promise, [result_container]);
    })

    ready && clearStack();

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
  
  return promise;
}