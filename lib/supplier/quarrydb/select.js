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

var _ = require('lodash'),
    utils = require('../../utils'),
    eyes = require('eyes'),
    async = require('async');

var ensure_skeleton = require('./ensure_skeleton');

/*
  Quarry.io Quarrydb -> Select Stage
  ----------------------------------

  Single Action of a single selector stage

  options
  -------

  {
    
  }

 */

function extractskeleton(data){
  return data.meta;
}

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
function getTreeQuery(splitter, skeleton_array){
  var or_array = [];

  _.each(skeleton_array, function(skeleton){
    
    // child mode
    if(splitter=='>'){
      or_array.push({
        'meta.parent_id':skeleton.quarryid
      })
    }
    // parent mode
    else if(splitter=='<'){
      or_array.push({
        'meta.quarryid':skeleton.parent_id
      })
    }
    else if(splitter=='<<'){
      or_array.push({
        '$and':[{
          'meta.left':{
            '$lt':skeleton.left
          }
        },{
          'meta.right':{
            '$gt':skeleton.right
          }
        }]
      })
    }
    // descendent mode
    else{

      or_array.push({
        '$and':[{
          'meta.left':{
            '$gt':skeleton.left
          }
        },{
          'meta.right':{
            '$lt':skeleton.right
          }
        }]
      })
    }
  })

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

function getQuery(options){

  var selector = options.selector;
  var skeleton_array = options.skeleton;

  var includedata = selector.modifier.laststep;
  var includechildren = includedata && selector.modifier.tree;

  var query_array = [];
  var main_query = {};

  // this is for a thing like:
  //    > folder.red product
  // i.e. folders on the root
  if(selector.splitter=='>' && skeleton_array.length<=0){
    main_query = {
      'meta.parent_id':null
    }
  }
  else if(selector.quarryid){
    main_query = {
      'meta.quarryid':selector.quarryid
    }
  }
  else if(selector.hardlink){
    if(selector.hardlink.match(/\w/)){
      main_query = {
        'meta.hardlink':selector.hardlink
      }
    }
    else{
      main_query = {
        'meta.hardlink':{
          '$exists':true
        }
      }  
    }
  }
  else if(selector.softlink){
    main_query = {
      'meta.softlinks.quarryid':selector.softlink
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
          'meta.tagname':selector.tagname
        });
      }

      if(selector.id){
        query_array.push({
          'meta.id':selector.id
        });
      }

      if(selector.classnames){

        _.each(_.keys(selector.classnames), function(classname){

          query_array.push({
            'meta.classnames':classname
          })
          
        })
      }

      if(selector.attr){
        _.each(selector.attr, function(attr){
          var field = 'attr.' + attr.field;
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
    if(skeleton_array.length>0){
     
      // the query that applies nested set on the links inside the _meta
      var tree_query = getTreeQuery(selector.splitter, skeleton_array);

      if(tree_query){
        query_array.push(tree_query);  
      }
    }

    main_query = query_array.length<=1 ? query_array[0] : {
      '$and':query_array
    }
  }

  var queryoptions = {

  }

  return {
    query:main_query,
    //fields:fields,
    fields:includedata ? null : {
      "meta":true
    },
    options:queryoptions,
    tree:includechildren
  }

}

var select = module.exports = function(mongoclient){

  return function(req, res, next){

    var selector = req.getHeader('x-json-selector');

    ensure_skeleton(mongoclient, req, res, function(){

      var skeleton = req.getHeader('x-json-skeleton');

      var query = getQuery({
        skeleton:skeleton,
        selector:selector
      })

      var self = this;

      mongoclient.find(query, function(error, results){

        if(error){
          res.error(error);
          return;
        }

        // here are the final results
        // check for a tree query to load all descendents also
        if(query.tree && results.length>0){

          // first lets map the results we have by id
          var results_map = {};

          _.each(results, function(result){
            results_map[result.meta.quarryid] = result;
          })

          // now build a descendent query based on the results
          var descendent_tree_query = getTreeQuery('', _.map(results, extractskeleton));

          descendent_query = {
            query:descendent_tree_query,
            fields:query.fields
          }
          
          // trigger the find of the descendents
          mongoclient.find(descendent_query, function(error, descendent_results){

            // loop each result and it's links to see if we have a parent in the original results
            // or in these results
            _.each(descendent_results, function(descendent_result){
              results_map[descendent_result.meta.quarryid] = descendent_result;
            })

            _.each(descendent_results, function(descendent_result){
              var parent = results_map[descendent_result.meta.parent_id];

              if(parent){
                parent.children || (parent.children = []);
                parent.children.push(descendent_result);
              }
            })

            res.containers(results).send();
          })
        }
        else{
          res.containers(results).send();
        }      
      })
    })
  }
}