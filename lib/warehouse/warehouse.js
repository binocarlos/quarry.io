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

  // named middlesware stack for general purpose
  // each function is passed:
  // (container, next)
  var middleware = {};

  // a function to make a container with the correct pointer
  var container_factory = function(data){
    var container = containerFactory(res, supply_chain);

    container.pointer()
  }
  // the root warehouse function - this is the main entry point
  // you pass in selector and context (can be container)
  // it gives back a promise providing 'each' and 'when'
  var warehouse = function(selector, context){

    var self = this;

    // create the promise that will be returned immediately
    var promise = promiseFactory(supply_chain);

    // used to pass the selector down the supply chain
    // when then map our warehouse id into the pointer for each result
    var run_selector = function(previous_results){

      // use the filtered context results to trigger the selector on them
      supply_chain({
        action:'select',
        selector:selectorFactory(selector),
        previous:previous_results || []
      }, function(err, res){
        var select_container = containerFactory(res.results, supply_chain);

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('HAVE SELECT');
        console.dir(select_container.raw());

        // use the filtered context results to trigger the selector on them
      })
    }

    var run_context = function(){
      // make sure the context is a string
      if(_.isFunction(context)){
        context = '=' + context.quarryid();
      }
      else if(_.isObject(context)){
        context = '=' + context._meta.quarryid;
      }
      
      // trigger a supply chain select for the context
      supply_chain({
        action:'select',
        selector:selectorFactory(context),
        previous:[]
      }, function(err, res){

        // we have the raw context results - filter them using warehouse middleware
        var context_container = containerFactory(res.results, supply_chain);

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('HAVE CONTEXT');
        console.dir(context_container.raw());

        // pipe the context results through the warehouse middleware
        warehouse.pipe('context', context_container.children(), function(error, child_results){

          // now we can check that the supply_chain for each child is the same as this warehouse
          // if it is not - create a new warehouse for the supply_chain

          console.log('HAVE PIPE RESULTS');
        })

        //var filtered_results = this.run_filter('context', context_container.children());

       
      })
    }

    // if we have a context we want the raw results for it first
    if(context){
      run_context();
    }
    else{
      run_selector();
    }
    

    //promise.keep(containerFactory(res, supply_chain));

    return promise;
  }

  warehouse = containerFactory(warehouse, supply_chain);

  // we are read_only if we have a custom supply_chain
  warehouse.readOnly(arguments.length>0);

  /*
    Register a named callback stack for filtering
  */
  warehouse.use = function(name, callback_function){
    middleware[name] || (middleware[name] = []);
    middleware[name].push(callback_function);
    return this;
  }

  /*
    utility the pass a whole list of containers through middleware and return
    the results
  */
  warehouse.pipe = function(name, containers, callback){
    containers || (containers = []);
    var ret = [];
    async.forEach(containers, function(container_in, next_container){
      warehouse.middleware(name, container_in, function(error, container_out){
        container_out && ret.push(container_out);
        next_container();
      })
    }, function(){
      callback(null, ret);
    })
  }

  /*
    pass a container through a named middleware stack for this warehouse
  */
  warehouse.middleware = function(name, container, callback){
    // we want the whole middleware stack
    if(arguments.length<=0){
      return middleware;
    }
    // we want a particular middleware chain
    else if(arguments.length==1){
      return middleware[name];
    }
    // we are running a chain with some results
    else{
      // array of functions to run over
      var middleware_stack = ([]).concat(middleware[name] || []);

      async.forEachSeries(middleware_stack, function(middleware_function, next_middleware_function){

        // this means the middleware function will run the callback
        if(middleware_function.length>=2){
          middleware_function.apply(warehouse, [container, function(return_container){
            container = return_container;
            // trigger a false 'error' that stops the middleware stack
            // and returns null (this is filtering out)
            next_middleware_function(container ? null : 'null');
          }])
        }
        // we are in charge of the callback ourselves
        else{
          container = middleware_function.apply(warehouse, [container]);

          next_middleware_function(container ? null : 'null');
        }
      }, function(error){
        // the container has been run through the middleware stack
        // if there is an error we run nothing
        callback(error, error ? null : container);
      })
    }
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
  // by running the function you are triggering it with data
  var promise = function(raw_data_array){
    this.set_data(raw_data_array);
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