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
var ContainerSupplier = require('../container');

/*
  Quarry.io - RAM Supplier
  ------------------------

  Holds containers in memory and performs actions


 */


var RawSupplier = module.exports = ContainerSupplier.extend({
  prepare:function(ready){
    this.create_cache(this.get('data'));
    ContainerSupplier.prototype.prepare.apply(this, [ready]);
  },
  create_cache:function(data){
    this.cache = cacheFactory({
      create_ids:this.get('create_ids'),
      data:data
    })
  },
  select:function(selector, skeleton, callback){
    this.cache.select(selector, skeleton, callback);
  },
  append:function(data, skeleton, callback){
    this.cache.append(data, skeleton, callback);
  }
/*
  ,
  _post:function(req, res){
    var id = this.extract_container_id(req.path());
    var body = req.body();

    var message = this.cache.append(id, body);

    this.stamp_message(message);

    //message.error = 'test';
    if(message.error){
      res.sendError(message.error);
    }
    else{
      req.broadcast(message.frequency, message);  
      res.send({
        ok:true
      })
    }
    
  }
  */
  
})