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

    // we do not bother if there are no branches
    if(req.action=='contract' && branches.length>0){

      warehouse.run_contract(req, callback);
    }
    // this is destined for another supply_chain
    else if(req.pointer && branches.length>0){
      console.log('HAVE POINTER');
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
  warehouse.branch = function(branch_function){
    branches.push(branch_function);
    return warehouse;
  }

  /*
    this captures the contract message and does the 2-step trick on it
  */
  warehouse.run_contract = function(req, callback){

    // trigger the initial select action
    root_supply_chain({
      action:'select',
      message:{
        selector:req.message.context
      }
    }, function(error, res){

      // here we have the raw results for the context - make a container
      var results = containerFactory(res.answer.results);

      // the remaining ids will be passed to the root_supply_chain as the next step selector previous
      var remaining_ids = [];

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
          var branch_result = branch_function.apply(warehouse, [context_result]);

          // this means the container has branched and the result is an alternative
          // supply_chain function
          if(branch_result!==false){
            branch_supply_chains[context_result.quarryid()] = branch_result;
          }
          // this means we are in normal trim and the context should be run against
          // this result normally
          else{
            remaining_ids.push(context_result.quarryid());
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
            previous:remaining_ids
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
                raw._data.pointer = branch_id;
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

        console.log('-------------------------------------------');
        console.log('at after');

        console.log(JSON.stringify(all_raw_results, null, 4));
      })

/*


        if(child.match('supplier')){
          fanout_functions.push(function(next){

            console.log('-------------------------------------------');
            console.log('-------------------------------------------');
            console.log('Trying 2nd layer');

            supplyChainFactory(child.attr('supply_chain'), child.attr(), function(branch_supply_chain){
              branch_supply_chain({
                action:'select',
                message:{
                  selector:req.message.selector
                }
              },function(error, res){
                // we have the raw results
                console.log('-------------------------------------------');
                console.log('-------------------------------------------');
                console.log('HAVE 2nd LAYER RESULTS');
                console.dir(res);
                fanout_results = fanout_results.concat(res.results);
                next();
              })
            })
          })
        }
        else{
          remaining_ids.push(child.quarryid());
        }
      })

      // append the default selector function
      // this is the context ids striped of the suppliers
      fanout_functions.push(function(next){
        root_supply_chain({
          action:'select',
          message:{
            selector:req.message.selector,
            previous:remaining_ids
          }
        },function(error, res){
          fanout_results = fanout_results.concat(res.results);
          next();
        })
      })

      async.parallel(fanout_functions, function(){
        console.log('-------------------------------------------');
        console.log('finished');
        console.dir(fanout_results);
      })
*/
    })

  }

  ready_callback && base_supplier.ready(ready_callback);

  return warehouse;
}

// expose createModule() as the module
exports = module.exports = factory;

