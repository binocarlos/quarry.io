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

function map(skeleton){
  return {
    "meta.quarryid":skeleton.quarryid
  }
}

function filterskeleton(skeleton){
  return skeleton.supplychainroot!=true;
}

var extract = module.exports = function(mongoclient, req, res, callback){

  var skeleton = req.getHeader('x-json-skeleton') || [];

  /*
  
    if there is already a left value then we already have a full skeleton
    
  */
  if(skeleton.length<=0 || skeleton[0].left){
    req.setHeader('x-json-skeleton', skeleton);
    callback();
    return;
  }

  if(skeleton[0].supplychainroot){
    req.setHeader('x-json-skeleton', []);
    callback();
    return;
  }

  var id_clause = _.map(skeleton, map);

  mongoclient.find({
    query:{
      '$or':id_clause
    },
    fields:{
      "meta":true
    }
  }, function(error, results){

    if(error){
      res.error(error);
      return;
    }

    var skeleton_results = _.map(results, function(result){
      return result.meta;
    })

    req.setHeader('x-json-skeleton', skeleton);
    
    callback();

  })
}