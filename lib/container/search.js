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

var _ = require('underscore');
var async = require('async');
var selectorParser = require('./selector')
var packetFactory = require('../packet');
var eyes = require('eyes');

module.exports = reduce;

/*
  Quarry.io - Container Search
  ----------------------------

  Takes an array of starting containers and a single selector stage

  It returns the matching containers - in sync mode


 */

function search(search_from, packet){

  var selector = packet.req.params();

  var selector_filter = selectorParser.compile(selector);

  var search_in = search_from;

  // we must now turn the search_from container into a flat array of the things to actually search

  // direct child mode
  if(selector.splitter=='>'){
    search_in = search_from.children();
  }
  // direct parent mode
  else if(selector.splitter=='<'){
    search_in = search_from.parent();
  }
  // all descendents mode
  else{
    search_in = search_from.descendents();
  }
  
  // now we loop each child container piping it via the selector filter
  return search_in.filter(selector_filter);
}

function merge_reducer(search_from, packets){
  var all_results = [];

  _.each(packets, function(raw_packet){
    all_results = all_results.concat(reduce(search_from, packetFactory.raw(raw_packet)).models);
  })

  return search_from.spawn(all_results);
}

function pipe_reducer(search_from, packets){
  var current_context = search_from;

  _.each(packets, function(raw_packet){
    current_context = reduce(current_context, packetFactory.raw(raw_packet));
  })

  return current_context;
}

var reducers = {
  pipe:pipe_reducer,
  branch:pipe_reducer,
  merge:merge_reducer
}
/*
  This is the sync version of a warehouse search used by in-memory container 'find' commands

  The packet will be either a straight select or a contract
 */
function reduce(search_from, packet){

  /*
    We have got down to the select level - pass it to search
   */
  if(packet.is('select')){
    return search(search_from, packet);
  }
  /*
    There is a contract to reduce
   */
  else if(packet.is('contract')){
    var params = packet.req.params();
    /*
      This means it is a contract step
     */
    if(params.packets && reducers[params.type]){

      /*
        We must reduce this contract phase
       */
      return reducers[params.type].apply(null, [search_from, params.packets]);
    }
    /*
      It's an actual select packet
     */
    else{
      var select_packet = packetFactory.raw(params);

      
      return reduce(search_from, select_packet);
    }
  }
}