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
  Quarry.io RAM Supplier
  -------------------

  In memory supplier

  options
  -------

  {
    
  }

 */



function factory(options, ready_callback){

  options || (options = {});

  var data = options.data || [];

  var actions = {};

  var chain = function(req, callback){

    // if we have a function for 'action' - run it
    if(actions[req.action]){
      actions[req.action].apply(this, [req, callback]);
    }
    else{
      callback({
        ok:false,
        error:req.action + ' action not found'
      })
    }

  }

  chain.options = options;

  /*
    return the raw underlying RAM data
  */
  chain.raw = function(){
    return data;
  }

  /*
    ram is auto-ready
  */
  chain.ready = function(callback){
    callback && callback(chain);
  }

  /*
    run context then selector in sequence
   */
  actions.contract = function(message, callback){
    var context = message.context;

    // first the context
    actions.select({
      selector:message.context
    }, function(error, res){

      // now run the selector against those results
      actions.select({
        selector:message.context
      }, function(error, res){

      })
    })

  }

  /*
    run a single selector stage over the RAM data
   */
  actions.select = function(message, callback){

    var selector = message.selector;

    // ensure we have an array of ids
    var previous = _.map(message.previous || [], function(val){
      return _.isObject(val) ? val._meta.quarryid : val;
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

    callback(null, {
      ok:true,
      results:all_results
    })
  }

  /*
    append one container to another
   */
  actions.append = function(message, callback){

    var search_container = containerFactory(data);

    var parent_id = message.parent_id;
    var child_data = message.child;

    if(!parent_id){
      search_container.append(containerFactory(child_data));
    }
    else{
      var parent_container = search_container.find('=' + parent_id);

      parent_container.append(containerFactory(child_data));
    }

    callback(null, {
      ok:true
    })

  }

  ready_callback && ready_callback(chain);

  return chain;
}

// expose createModule() as the module
exports = module.exports = factory;

