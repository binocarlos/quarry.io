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

var utils = require('../utils');
var _ = require('underscore');
var eyes = require('eyes');
var packetFactory = require('../packet');
module.exports = factory;

/*
  Quarry.io Warehouse Reducer
  ---------------------------

  Knows how to take a supply chain end-point (one that answers a single selector)
  and return a supply chain that can reduce an entire contract

  You can optionally pass a router function - each step is routed via this function
  if given - this gives the option to grid the whole contract

  It's job is to basically take a contract message and split it into smaller
  messages - each of which are sent via the router

 */

function factory(options){

  options || (options = {});

  // default is to loop back
  var supply_chain = options.supply_chain ? options.supply_chain : function(packet, callback){
    callback(null, packet);
  }

  // if we have a branch function we send the branch steps down in wholesale
  var branch_function = options.branch ? options.branch : supply_chain;

  var sync = options.sync ? true : false;

  // return a function that will resolve a branching array
  function branch_factory(packet){

    if(sync){
      return function(){
        _.each(packet.packets, function(branch_packet){

          var branch_contract_packet = packetFactory.contract(branch_packet);

          // run the branch packet and filter the results
          branch_function(branch_packet, function(answer_packet){

            // we now compare the routes
            
          })
        })
      }
    }
  }

  // return a function that will resolve a branching array
  function merge_factory(packet){

  }

  // return a function that will resolve a branching array
  function pipe_factory(packet){

  }

  // this accepts a contract and will pipe each packet found down the given supply chain
  function reduce(contract_packet){

    var base_packet = contract_packet.req.params();


    // this means we have filtered down to 
    if(!base_packet._contract){

    }

    console.log('-------------------------------------------');
    eyes.inspect(base_packet);

    // the test of whether we have a contract or a packet
    //if(contract._contract){

    //}


  }

  return reduce;
}