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



function factory(options){

  options || (options = {});

  var data = options.data || [];

  var actions = {
    append:function(message, callback){

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
        status:'ok'
      })

    },
    select:function(message, callback){
      var search_container = containerFactory(data);

      if(message.contract){
        var contract_results = search_container.find(message.contract);

        var all_results = [];

        _.each(contract_results, function(contract_result){
          all_results = all_results.concat(contract_result.find(message.selector))
        })

        callback(null, _.map(all_results, function(result){
          return result.raw();
        }))
      }
      else{
        var selector_results = search_container.find(message.selector);

        callback(null, _.map(selector_results, function(result){
          return result.raw();
        }))
      }
    }
  }
  var chain = function(message, callback){
    // if we have a function for 'action' - run it
    if(actions[message.action]){
      actions[message.action].apply(this, [message, callback]);
    }
    
  }

  chain.raw = function(){
    return data;
  }

  return chain;
}

// expose createModule() as the module
exports = module.exports = factory;

