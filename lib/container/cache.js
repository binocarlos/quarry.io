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
    eyes = require('eyes'),
    searcher = require('./search'),
    utils = require('../utils'),
    containerFactory = require('../container'),
    async = require('async');

module.exports = factory;

/*
  Quarry.io Container Cache
  -------------------------

  Used for holding containers in memory over a period of time

  When the previous results are passed in it is exclusively quarryid used for pre-selection

  To start - this cache just works on quarryid

  options
  -------

  {
    
  }

 */

function factory(options){

  options || (options = {});

  var root_data = options.data || [];

  // maps quarry ids onto models
  var map = {};

  var root_container = containerFactory(root_data);

  root_container.recurse(function(container){
    map[container.quarryid()] = container.get(0);
  })

  function cache(){}

  cache.run_selector = function(previous, selector){

    // if this gets set it means the context is the top of the tree
    var found_root = false;

    var context_models = _.filter(_.map(previous, function(raw){

      // at this point raw is the _meta
      var id = raw._meta && raw._meta.quarryid ? raw._meta.quarryid : null;

      if(id=='warehouse'){

        found_root = true;
        return null;
      }

      return map[id];
    }), utils.notnull);

    if(found_root){
      context_models = root_container.models;
    }

    var search_from = containerFactory(context_models);

    var ret = searcher(search_from, selector);

    return ret;
  }

  cache.get = function(id){
    return map[id];
  }

  cache.add = function(id, model){
    map[id] = model;
    return this;
  }

  cache.delete = function(id){
    delete(map[id]);
  }

  return cache;
}