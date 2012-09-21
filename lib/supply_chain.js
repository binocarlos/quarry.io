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
    async = require('async');
    
/*
  Quarry.io Supply Chain
  ----------------------

  the 2/3 step process of converting containers to point to other warehouses
  before hitting the next stage of the chain


 */

//
// router is a function that 
function factory(router){

  var supply_chain = function(packet, callback){

    // if we have a function for 'action' - run it
    if(actions[packet.action]){
      actions[packet.action].apply(this, [packet, callback]);
    }
    // otherwise pass it directly to the warehouse to answer
    else{
      router(packet, callback);
    }

  }

  warehouse.data = data;

  /*
    run a single selector stage over the RAM data
   */
  actions.contract = function(packet, callback){

    var message = packet.message;

    var selector = message.selector;
    var previous = _.map(message.previous, function(prev){
      return _.isObject(prev) ? prev._meta.quarryid : prev;
    })

    var root_container = containerFactory(data);
    var search_within_containers = [];

    // do we have any previous results to search within?
    if(previous && previous.length>0){

      var previous_ids = {};

      _.each(previous, function(prev){
        previous_ids[prev] = true;
      })

      // grab the containers by their id within the descendents
      search_within_containers = _.filter(root_container.descendents(), function(descendent){
        return previous_ids[descendent.quarryid()];
      })
    }
    else{

      // this is the root container as the starting point
      search_within_containers = [root_container];

    }

    var all_results = [];

    _.each(search_within_containers, function(search_within_container){
      all_results = all_results.concat(search_within_container.find_raw(selector));
    })

    packet.answer = {
      ok:true,
      results:all_results
    }

    callback(null, packet);
  }

  /*
    append one container to another
   */
  actions.append = function(packet, callback){

    var message = packet.message;

    var search_container = containerFactory(data);

    var parent_id = message.parent;
    var child_data = message.append_array;

    if(!_.isArray(child_data)){
      child_data = [child_data];
    }

    _.each(child_data, function(child_data_single){
      if(!parent_id){
        search_container.append(containerFactory(child_data_single));
      }
      else{
        var parent_container = search_container.find('=' + parent_id);

        parent_container.append(containerFactory(child_data_single));
      }
    })

    packet.answer = {
      ok:true
    }

    callback(null, packet);
  }

  ready_callback && ready_callback(chain);

  return chain;
}

// expose createModule() as the module
exports = module.exports = factory;

