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
var utils = require('../../utils');
var eyes = require('eyes');
var cacheFactory = require('../../container/cache');
var proto = require('../proto');

/*
  Quarry.io - RAM Supplier
  ------------------------

  Holds containers in memory and performs actions


 */

var api = module.exports = proto.extend({
  prepare:function(ready){
    this.options = options;
    this.create_cache(this.get('data'));
    ready && ready(null, this);
  },
  create_cache:function(data){
    this.cache = cacheFactory({
      create_ids:this.get('create_ids'),
      data:data
    })
  },
  _head:function(req, res, next){
    console.log('raw head');
  },
  _get:function(req, res, next){
    var self = this;
    var all_results = [];


    async.forEach(req.param('skeleton'), function(skeleton, next_skeleton){

      var results = self.cache.select(skeleton.meta.quarryid, req.param('select'));

      all_results = all_results.concat(results ? results.toJSON() : []);

      next_skeleton();
    }, function(error){
      if(error){
        res.sendError(error);
      }
      else{
        self.write_results(req, res, all_results);
      }
    })
  }
})