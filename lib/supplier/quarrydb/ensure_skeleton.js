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

/*
  Quarry.io Quarrydb -> Ensure Skeleton
  -------------------------------------

  If we have a skeleton with just id's - this will load the meta data
  properly from the DB first


 */

var extract = module.exports = function(mongoclient, skeleton, callback){

  // if the skeleton is the root then there is no loading to do
  if(skeleton[0].quarryid=='/' || skeleton[0].left){
    callback(null, skeleton);
    return;
  }
  
  var id_clause = _.map(skeleton, function(skeleton){
    return {
      "meta.quarryid":skeleton.quarryid
    }
  })

  mongoclient.find({
    query:{
      '$or':id_clause
    },
    fields:{
      "meta":true
    }
  }, function(error, results){

    if(error){
      callback(error);
      return;
    }
    var skeleton_results = _.map(results, function(result){
      return result.meta;
    })
    
    callback(null, skeleton_results);

  })
}