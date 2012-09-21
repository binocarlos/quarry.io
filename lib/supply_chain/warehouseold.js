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
    containerFactory = require('../container'),
    eyes = require('eyes'),
    ramSupplyChain = require('./ram'),
    async = require('async');
    
/*
  Quarry.io Warehouse Supply Chain
  --------------------------------

  2 step supplier that triggers middleware for the context results to load from other places

  you base the base supplier - you can add middleware functions that will
  branch for context results

  every message is analyzed so the correct supply_chain is found for it

 */



function factory(root_supply_chain, ready_callback){

  root_supply_chain || (root_supply_chain = ramSupplyChain());

  // the array of branching middleware for the warehouse
  var branches = [];

  var warehouse = function(req, callback){

    // the basic select branch to insert branch flags
    if(req.action=='select' && branches.length>0){

      warehouse.run_select(req, callback);
    }
    // if there are some branches then filter the call to contract and branch
    else if(req.action=='contract' && branches.length>0){

      warehouse.run_contract(req, callback);
    }
    // this is destined for another supply_chain
    else if(req.message.pointer && branches.length>0){
      console.log('HAVE POINTER');
      eyes.inspect(req);
    }
    // a default one - pipe normally
    else{   
      root_supply_chain(req, callback);
    }

  }

  /*
    defer any ready callbacks to the base supply chain
  */
  warehouse.ready = function(callback){
    callback && root_supply_chain.ready(callback);
    return this;
  }

  /*
    the supply chain we pass our messages onto by default
  */
  warehouse.root_supply_chain = function(new_chain){
    return new_chain ? root_supply_chain = new_chain : root_supply_chain;
  }

  /*
    add branch middleware to the stack - accept one container and a callback
  */
  warehouse.branch = function(selector, branch_function){

    var use_branch_function = branch_function;

    // we auto-run the selector part
    if(arguments.length==2){
      branch_function = function(container){

        // this basically ignores the branch
        if(!container.match(selector)){
          return true;
        }
        else{
          return use_branch_function.apply(warehouse, [container]);
        }
      }
    }
    else{
      branch_function = selector;
      selector = null;
    }

    branches.push(branch_function);

    return warehouse;
  }

  /*
    run the container through the branch and see if the supply chain is different
  */
  warehouse.get_container_branch = function(container){
    // run over each branch function and return the first thing that is not false
    var found_branch = null;

    _.each(branches, function(branch_function){
      var branch = branch_function.apply(warehouse, [container]);

      // do we branch for this container?
      if(_.isFunction(branch)){
        found_branch = branch;
      }
    })

    return found_branch;
  }

  /*
    filter the containers using the branch functions

    then pipe back to the worker with batches of containers with supply chain

    branch filter is called for each container that passed
  */
  warehouse.batch_branches = function(containers){

    if(arguments.length==2){
      worker = branch_filter;
      branch_filter = null;
    }

    var batch_array = [];
    var default_containers = [];

    _.each(containers, function(container){
      var branch = warehouse.get_container_branch(container);

      if(_.isFunction(branch)){
        batch_array.push([
          supply_chain:branch,
          pointer:container.skeleton()
        ])
      }
      else{
        default_containers.push(container);
      }
    })

    // add the default step if
    //  a) there was no previous
    //    or
    //  b) we have results from the previous

    if(containers.length<=0 || default_containers.length>0){
      batch_array.push({
        supply_chain:root_supply_chain,
        containers:default_containers
      })  
    }
    
    return batch_array;
  }

  /*
    the main branching function
  */
  warehouse.run_select_branches = function(selector, previous, branch_callback){
    // here we have the raw results for the context - make a container
    var results = containerFactory(previous);

    var batches = warehouse.batch_branches(results.children());

    var async_loaders = [];
    var all_raw_results = [];

    // loop each batch
    async.forEach(batches, function(batch, batch_finished){

      // run the supply chain branches
      batch.supply_chain({
        action:'select',
        message:{
          selector:selector,
          previous:batch.containers || []
        }
      }, function(error, res){
          // lets insert a pointer to the branch_id into each container
          // this is how we can route the container back to the correct supply chain
          all_raw_results = all_raw_results.concat(_.map(res.answer.results, function(raw){
            raw._data || (raw._data = {})

            // this will only be set for branched results
            raw._data.branch = batch.pointer;
            return raw;
          }))
      })
    })
  }

  /*
    run the results of the normal select through the branches
  */
  warehouse.run_select = function(req, warehouse_callback){
    // trigger the initial select action
    root_supply_chain({
      action:'select',
      message:{
        selector:req.message.context,
        previous:req.message.previous
      }
    }, warehouse_callback);
  }

  /*
    this captures the contract message and does the 2-step trick on it
  */
  warehouse.run_contract = function(req, warehouse_callback){

    // trigger the initial select action
    warehouse.run_select({
      action:'select',
      message:{
        selector:req.message.context,
        previous:req.message.previous
      }
    }, function(error, res){

      // here we have the raw results for the context - make a container
      var results = containerFactory(res.answer.results);

      var batches = warehouse.batch_branches(results);

      var async_loaders = [];

      // loop each batch
      _.each(batches, function(batch){

        // the actual load function we run via async
        async_loaders.push(function(next){

          batch.supply_chain({

          })
        })
      })


      // the remaining meta will be passed to the root_supply_chain as the next step selector previous
      var remaining_containers = {};

      // these are branching supply chain functions the next step should be run through
      // the previous ids will not be passed through

      // this is a map of container id onto alternate supply_chain function
      var branch_supply_chains = {};

      // the full array of results from our branches and ourselves
      var branch_results = [];


      // run over each of the context containers
      results.each(function(context_result){

        // run over each branch function and pass it the context container
        _.each(branches, function(branch_function){
          var branch = branch_function.apply(warehouse, [context_result]);

          // do we branch for this container?
          if(_.isFunction(branch)){
            branch_supply_chains[context_result.quarryid()] = branch;

            
          }
          else{
            remaining_containers[context_result.quarryid()] = {
              _meta:context_result.meta()
            }
          }          
        })

      })

      // so now lets build up our async function list
      var second_steps = [];

      // the merged array of the second step results
      var all_raw_results = [];

      // first the default load off to the remaining context results
      second_steps.push(function(next_step){
        root_supply_chain({
          action:'select',
          message:{
            selector:req.message.selector,
            previous:_.values(remaining_containers)
          }
        }, function(error, res){

            // directly map the default results - they do not need a pointer
            all_raw_results = all_raw_results.concat(res.answer.results);
            next_step();
        })
      })

      // here we loop over the branch functions - and wait for them to be ready
      // we then add the function to the second_steps that will get the results
      // and then add the container_id onto the results (as a pointer)
      _.each(_.keys(branch_supply_chains), function(branch_id){

        // the branch_id is the container id - the function is the supply chain to use
        var branch_function = branch_supply_chains[branch_id];

        second_steps.push(function(next_step){
          // first lets wait for the supply chain to be ready
          var branch_chain_is_ready = function(){

            // run the next selector through the branch supply chain
            branch_function({
              action:'select',
              message:{
                selector:req.message.selector
              }
            }, function(error, res){

              // lets insert a pointer to the branch_id into each container
              // this is how we can route the container back to the correct supply chain
              all_raw_results = all_raw_results.concat(_.map(res.answer.results, function(raw){
                raw._data || (raw._data = {})
                raw._data.branch = branch_id;
                return raw;
              }))

              next_step();
            })
          }

          branch_function.ready ? branch_function.ready(branch_chain_is_ready) : branch_chain_is_ready();  
        })

      })

      // run all of the next step selectors in parallel
      async.parallel(second_steps, function(error){

        req.answer = {
          ok:true,
          results:all_raw_results
        };

        warehouse_callback(error, req);
      })

    })

  }

  ready_callback && base_supplier.ready(ready_callback);

  return warehouse;
}

// expose createModule() as the module
exports = module.exports = factory;

