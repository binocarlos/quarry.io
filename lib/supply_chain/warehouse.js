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
      var results = containerFactory(res.results);

      // the remaining ids will be passed to the root_supply_chain as the next step selector previous
      var remaining_ids = [];

      // these are branching supply chain functions the next step should be run through
      // the previous ids will not be passed through
      var branch_supply_chains = [];

      // the full array of results from our branches and ourselves
      var branch_results = [];

      results.each(function(child){

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('RUNNING BRANCH RESULT: ');
        console.log(child.toString());
      })
        /*
        async.forEach(branches, function(branch_function, next_branch){
          branch_function
        })
        */
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

