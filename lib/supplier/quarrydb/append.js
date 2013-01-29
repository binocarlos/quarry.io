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
    async = require('async'),
    eyes = require('eyes'),
    bigint = require('bigint');

var treeEncoder = require('rationalnestedset');

var tools = require('./tools');

    /*
    EventEmitter = require('events').EventEmitter,
    Response = require('../../../query/response'),
    eyes = require('eyes'),
    Container = require('../../../container'),
    treeEncoder = require('../tree_encoders/rationalnestedset'),
    
    
    utils = require('../../../utils'),
    */
    

/*
  Quarry.io Quarrydb -> Append
  ----------------------------------

  Add some data to a place in the quarrydb tree

  options
  -------

  {
    
  }
 */


// get the next available position index for this container
function getNextRootPosition(mongoclient, callback){
  var options = {
    query:{
      'meta.parent_id':null
    },
    map:function(){
      emit('position', this.meta.position);
    },
    reduce:function(k,v){
      var max = 0;
      v.forEach(function(vv){
        max = vv>max ? vv : max;
      })
      
      return max;
    }
  }

  mongoclient.mapreduce(options, function(error, results){
    
    var result = results && results.length>0 ? results[0] : {
      value:0
    }

    callback(error, result.value + 1);
  })
  
}

function getPaddedNumber(num){

  return '' + num + '00000000000000000000000000000000';
  
}

function getEncodingValue(top, bottom){

  var fixedLength = 36;

  top = bigint(getPaddedNumber(top));
  bottom = bigint(bottom);

  var answer = top.div(bottom).toString();

  while(answer.length<fixedLength){
    answer = '0' + answer;
  }

  return answer;
}

function assignTreeEncodings(meta){
  var encodings = treeEncoder(meta.position_array);
    
  meta.left_encodings = encodings.left;
  meta.right_encodings = encodings.right;

  meta.left = getEncodingValue(encodings.left.numerator, encodings.left.denominator);
  meta.right = getEncodingValue(encodings.right.numerator, encodings.right.denominator);
}

function saveContainer(mongoclient, data, callback){  
  
  tools.save(mongoclient, data, callback);

}

// assigns the links needed to add one container to another - recursivly down the tree
function cascadeInsert(mongoclient, data, parent_data, callback){

  // this is where we append to the top
  if(!callback){
    callback = parent_data;
    parent_data = null;
  }

  /*
  
    this means we are appending to the top of the database
    
  */
  if(!parent_data){

    getNextRootPosition(mongoclient, function(error, next_root_position){

      data.meta.position = next_root_position;
      data.meta.position_array = [next_root_position];

      assignTreeEncodings(data.meta);

      saveContainer(mongoclient, data, function(){

        async.forEach(data.children || [], function(child_data, next_child){
          cascadeInsert(mongoclient, child_data, data, next_child);
        }, function(error){
          callback(error, data);
        })

      })


    })
  }
  else{

    data.meta.position = parent_data.meta.next_position++;
    data.meta.position_array = parent_data.meta.position_array.concat([data.meta.position]);
    data.meta.parent_id = parent_data.meta.quarryid;
    
    assignTreeEncodings(data.meta);

    saveContainer(mongoclient, parent_data, function(){
      saveContainer(mongoclient, data, function(){

        async.forEach(data.children || [], function(child_data, next_child){
          cascadeInsert(mongoclient, child_data, data, next_child);
        }, function(error){
          callback(error, data);
        })

      })
    })
  }
}
 
var append = module.exports = function(mongoclient){

  return function(options, callback){

    var self = this;

    options || (options = {});

    var data_array = options.body;
    var skeleton = options.skeleton[0];

    var target_id = skeleton.id;

    var results = [];

    function run_append(parent_data){

      var results = [];

      /*
      
        run through each of the appending containers and insert them into the DB
        
      */
      async.forEachSeries(data_array, function(data, next_data){
        
        cascadeInsert(mongoclient, data, parent_data, function(error){

          results = results.concat(data);
          next_data(error);

        })

      }, function(error){
        callback(error, data_array);
      })


    }

    /*
    
      do we have a specific container to append to?
      
    */
    if(target_id && target_id!='/'){
      // first load up the parent fully
      mongo_client.find({
        "meta.quarryid":target_id
      }, function(error, results){

        /*
        
          the parent id is not found!
          
        */
        if(!results || results.length<=0){
          next_parent();
        }
        else{
          run_append(results[0]);
        }
      })
    }
    else{
      run_append();
    }

  }
  
}