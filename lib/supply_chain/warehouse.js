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
    api = require('../supply_chain'),
    async = require('async');
    
/*
  Quarry.io Warehouse Supply Chain
  --------------------------------

  2 step supplier that triggers middleware for the context results to load from other places

  every message is analyzed so the correct supply_chain is found for it

  this is done by the 'route' which each container keeps in it's temp _data

 */

// inject the given route into the raw results - we only need to do it top level
// the value will cascade down the in-memory decendents
function inject_route(route, raw_results){

  if(!route){
    return raw_results;
  }
  _.each(raw_results, function(raw_result){
    raw_result._data || (raw_result._data = {});
    raw_result._data.route = route;
  })
  return raw_results;
}

function factory(router, options){

  options || (options = {});

  var warehouse = function(main_packet, main_callback){

    var self = this;

    var default_route = main_packet.route;

    // route the packet to get the supply chain and route to use for containers
    router(default_route, main_packet, function(error, default_supply_chain){

      // yikes - we have been given no supply chain!!
      if(error || !default_supply_chain){
        main_packet.answer = {
          ok:false,
          error:error
        }
        main_callback(error, main_packet);
      }

      // this means that we branch don't just send it
      if(main_packet.action=='select'){

        // make the reducer that will route on context
        var reducer = api.reduce_select(default_supply_chain, {
          
          // here are the triggers for the reducer
          context:function(packet){
            

            // tell the reducer we are at context stage
            packet.step = 'context';
            
            // here is the context 'branch' - it hits the context but then studies the results
            //
            // first lets get the initial context results
            default_supply_chain(packet, function(error, packet){

              // the array of non-branching normal second step results
              var normal_containers = [];

              // the array of branching functions
              var branches = [];

              // the final merged results
              var all_results = [];

              function run_branched_selector(supply_chain, route, callback){
                // now trigger the selector via it
                supply_chain({
                  action:'select',
                  message:{
                    // the next step selector from the main packet
                    selector:main_packet.message.selector
                  }
                }, function(error, answer_packet){

                  // inject the branched route into the results
                  inject_route(route, answer_packet.answer.results);

                  // now merge them
                  all_results = all_results.concat(answer_packet.answer.results);

                  // next async
                  callback();

                })  
              }

              // now lets see if we have any 'routes' in the context
              _.each(packet.answer.results, function(raw_result){

                // we have found a branch
                if(raw_result._meta && raw_result._meta.route){

                  // this is the routing info passed to 'router' to create us
                  // a supply chain to pipe down
                  var branched_route = raw_result._meta.route;

                  // this is the branching function that loads from the other supply chain
                  branches.push(function(next){

                    // first lets load up the branched supply chain
                    router(branched_route, main_packet, function(error, branched_chain){

                      run_branched_selector(branched_chain, branched_route, next);
                      
                    })
                    
                  })
                }
                else{
                  normal_containers.push(raw_result);
                }
              })

              // this is the default next step to the original supply chain
              branches.push(function(next){

                run_branched_selector(default_supply_chain, default_route, next);
                
              })

              // now we run all the branches in parallel
              // when they are all finished we have 'all_results'
              async.parallel(branches, function(error){

                // here we have the final - merged results
                main_packet.answer = {
                  ok:true,
                  results:all_results
                }

                main_callback(error, main_packet);

              })
            })
          }

        })

        // trigger the reducer
        reducer(main_packet, main_callback);

      }
      else{


        // this means we are running a normal direct to endpoint packet
        // therefore there is no mapping of routes needed
        default_supply_chain(main_packet, main_callback);
      }
    })

  }

  return warehouse;
}

// expose createModule() as the module
exports = module.exports = factory;

