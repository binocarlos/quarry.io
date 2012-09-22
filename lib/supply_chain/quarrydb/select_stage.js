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
    containerFactory = require('../../container'),
    utils = require('../../utils'),
    eyes = require('eyes'),
    async = require('async');
    
/*
  Quarry.io Quarrydb -> Select Stage
  ----------------------------------

  Single Action of a single selector stage

  options
  -------

  {
    
  }

 */


var operator_functions = {
  "=":function(field, value){
    var ret = {};
    ret[field] = value;
    return ret;
  },
  "!=":function(field, value){
    var ret = {};
    ret[field] = {
      '$ne':value
    }
    return ret;
  },
  ">":function(field, value){
    var ret = {};
    ret[field] = {
      '$gt':parseFloat(value)
    }
    return ret;
  },
  ">=":function(field, value){
    var ret = {};
    ret[field] = {
      '$gte':parseFloat(value)
    }
    return ret;
  },
  "<":function(field, value){
    var ret = {};
    ret[field] = {
      '$lt':parseFloat(value)
    }
    return ret;
  },
  "<=":function(field, value){
    var ret = {};
    ret[field] = {
      '$lte':parseFloat(value)
    }
    return ret;
  },
  "^=":function(field, value){
    var ret = {};
    ret[field] = {
      field:new RegExp('^' + utils.escapeRegexp(value), 'i')
    }
    return ret;
  },
  "$=":function(field, value){
    var ret = {};
    ret[field] = {
      field:new RegExp(utils.escapeRegexp(value) + '$', 'i')
    }
    return ret;
  },
  "~=":function(field, value){
    var ret = {};
    ret[field] = {
      field:new RegExp('\W' + utils.escapeRegexp(value) + '\W', 'i')
    }
    return ret;
  },
  "|=":function(field, value){
    var ret = {};
    ret[field] = {
      field:new RegExp('^' + utils.escapeRegexp(value) + '-', 'i')
    }
    return ret;
  },
  "*=":function(field, value){
    var ret = {};
    ret[field] = {
      field:new RegExp(utils.escapeRegexp(value), 'i')
    }
    return ret;
  }
}

// get the Mongo Query for the link tree
function getLinkTreeQuery(deep_mode, raw_data_array){
  var or_array = [];

  _.each(raw_data_array, function(raw_data){
    
    if(deep_mode){

      var links = raw_data._meta.links ? raw_data._meta.links : [];
      var first_link = links[0] || {};

      or_array.push({
        '$and':[{
          '_meta.links.left':{
            '$gt':first_link.left
          }
        },{
          '_meta.links.right':{
            '$lt':first_link.right
          }
        }]
      })
    }
    else{
      or_array.push({
        '_meta.links.parent_id':raw_data._meta.quarryid
      })
    }
  });

  if(or_array.length<=0){
    return null;
  }
  else if(or_array.length==1){
    return or_array[0];
  }
  else{
    return {
      '$or':or_array
    }
  }
}

function getQuery(packet){

  var message = packet.message;
  var selector = _.isArray(message.selector) ? message.selector[0][0] : message.selector;
  var previous = message.previous;

  // are we the last selector (i.e. grab all fields)
  var skeleton = message.skeleton;

  // will the tree selector go deep or just for children
  var deep_mode = selector.splitter=='>' ? false : true;

  var query_array = [];
  var main_query = {};

  // this is for a thing like:
  //    > folder.red product
  // i.e. folders on the root
  if(selector.splitter=='>' && (!previous || previous.length<=0)){
    main_query = {
      '_meta.links.parent_id':null
    }
  }
  else if(selector.quarryid){
    main_query = {
      '_meta.quarryid':selector.quarryid
    }
  }
  else{
    if(selector.tagname=='*'){
      query_array.push({
        '$where':'1==1'
      })
    }
    else {
      if(selector.tagname){
        query_array.push({
          '_meta.tagname':selector.tagname
        });
      }

      if(selector.id){
        query_array.push({
          '_meta.id':selector.id
        });
      }

      if(selector.classnames){

        _.each(_.keys(selector.classnames), function(classname){
          var key = '_meta.classnames.' + classname
          var chunk = {};
          chunk[key] = {
            '$exists':true
          };
          query_array.push(chunk);
        })
      }

      if(selector.attr){
        _.each(selector.attr, function(attr){
          var field = attr.field;
          var operator = attr.operator;
          var value = attr.value;

          if(_.isEmpty(operator)){
            query_array.push({
              field:{
                '$exists':true
              }
            });
          }
          else{
            var operator_function = operator_functions[operator];

            query_array.push(operator_function(field, value));
          }
        })
      }
    }

    // are we looking within other results?
    if(previous){
     
      // the query that applies nested set on the links inside the _meta
      var link_tree_query = getLinkTreeQuery(deep_mode, previous);

      if(link_tree_query){
        query_array.push(link_tree_query);  
      }
    }

    main_query = query_array.length<=1 ? query_array[0] : {
      '$and':query_array
    }
  }

  // are we the last selector and not in skeleton mode - in which case we want all data
  var fields = skeleton ? {
    _meta:true
  } : null;

  var options = {

  }

  return {
    query:main_query,
    fields:fields,
    options:options
  }

}

function select_stage(mongo_client, packet, callback){

  var query = getQuery(packet);

  mongo_client.find(query, function(error, results){
    packet.answer = {
      ok:!error,
      results:results
    }
    callback(error, packet);
  });

}

// expose createModule() as the module
exports = module.exports = select_stage;

