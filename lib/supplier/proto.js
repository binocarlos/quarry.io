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
var utils = require('../utils');
var Backbone = require('../vendor/backbone');
var eyes = require('eyes');

/*
  Quarry.io - Supplier
  ------------------------

  maps REST onto functions


 */

var Proto = module.exports = Backbone.Model.extend({
  initalize:function(){

  },

  prepare:function(ready){
    ready && ready(null, this);
  },

  handle:function(req, res, next){
    var self = this;
    var fn = this.get_method_handler(req.method());
    if(!fn){
      res.send404();
      return;
    }

    this._before(req, res);

    res.on('send', function(){
      self._after(req, res);
    })


    fn(req, res, next);
    
  },

  /*
  
    Write the results back to the res - check if we need to stamp the results first

   */

  write_results:function(req, res, results){
    if(req.param('includestamp')){
      results = this.stamp(results);
    }

    res.send(results);
  },

  /*
  
    Stamp the route onto outgoing container data

   */
  stamp:function(results){
    var self = this;
    
    return _.map(results, function(raw){
      raw.route = self.get('route') + '/' + raw.meta.quarryid;
      return raw;
    })
  },

  get_handler:function(){
    return _.bind(this.handle, this);
  },

  get_method_handler:function(method){
    method = '_' + method;
    if(!this[method]){
      return null;
    }
    return _.bind(this[method], this);
  },

  _before:function(req, res){

  },

  _after:function(req, res){

  },

  _head:function(req, res, next){
    res.send404();
  },

  _get:function(req, res, next){
    var self = this;
    var all_results = [];

    async.forEach(req.param('skeleton'), function(skeleton, next_skeleton){

      self._select(skeleton.meta.quarryid, req.param('select'), function(results){
        all_results = all_results.concat(results ? results.toJSON() : []);

        next_skeleton();  
      })
      
    }, function(error){
      if(error){
        res.sendError(error);
      }
      else{
        self.write_results(req, res, all_results);
      }
    })
  },

  _post:function(req, res, next){
    res.send404();
  },

  _put:function(req, res, next){
    res.send404();
  },

  _delete:function(req, res, next){
    res.send404();
  }
})