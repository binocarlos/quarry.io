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
var eyes = require('eyes');
var BaseSupplier = require('./proto');
var resolver = require('./resolver');

/*
  Quarry.io - Container Supplier
  ------------------------------

  A supplier that will load container data from selectors


 */

// a map where if the container id is one of these then the actual container
// id is one level down in the url
//
// /meta/1234

var api_methods = {
  meta:function(req, res, next){

  }
}

var ContainerSupplier = module.exports = BaseSupplier.extend({

  prepare:function(ready){
    BaseSupplier.prototype.prepare.apply(this, [ready]);
  },

  ensure_skeleton:function(req){
    if(!req.hasSkeleton()){
      req.skeleton([{
        id:req.path().replace(/^\//, '') || 'warehouse'  
      }])
    }
  },

  /*

    The entry point for ALL requests

    GET + selector + skeleton = resolver
    GET + skeleton = meta


   */
  router:function(req, res, next){

    var self = this;

    if(req.method()=='get'){

      // we use the resolver for selectors
      if(req.hasSelectors()){

        this.ensure_skeleton(req);

        resolver({
          req:req,
          res:res,
          supplychain:_.bind(self.selector, self)
        })

        return;
      }
      else if(req.hasSelector()){

        this.ensure_skeleton(req);

        this.selector(req, res, next);

        return;
      }
      // we are accessing data by id
      else if(req.hasSkeleton()){

      }
    }

    next();
  },

  mapper:function(req, results){
    return _.map(results, function(result){
      if(!req.param('includechildren')){
        result.children = [];
      }

      if(!req.param('includedata')){
        result = _.extend({}, {
          id:result.meta ? result.meta.quarryid : result.id
        }, result.meta ? result.meta.skeleton : {});
      }

      return result;
    })
  },

  /*

    The supplychain for the resolver

    When requests get here they always have a single selector

    It might have multiple skeletons - it is up to the supplier how to branch
    out from here

   */
  selector:function(req, res, next){

    var self = this;

    var all_results = [];
    
    async.forEach(req.skeleton(), function(singleskeleton, next_skeleton){

      self.select(req.selector(), self.mapInputSkeleton(singleskeleton), function(error, results){
        if(!error){
          all_results = all_results.concat(results ? results : []);
        }
        next_skeleton();
      })
        
    }, function(error){

      if(error){
        res.sendError(error);
      }
      else{
        res.contentType('quarry/containers')
        res.send(self.mapper(req, all_results));
      }
    })
  },

  select:function(selector, skeleton, callback){

  },

  mapInputSkeleton:function(skeleton){
    if(skeleton.warehouse){
      skeleton.id = 'warehouse';
    }
    return skeleton;
  }


/*
  get:function(req, res, next){

  },

  post:function(req, res, next){

  },

  put:function(req, res, next){

  },

  delete:function(req, res, next){

  }



  write_results:function(req, res, results){
    if(req.param('includestamp')){
      results = this.stamp(results);
    }

    res.send(results);
  },

  stamp:function(results){
    var self = this;
    
    return _.map(results, function(raw){
      raw.route = self.get('route') + '/' + raw.meta.quarryid;
      return raw;
    })
  },

  stamp_message:function(message){
    message.frequency = message.target ? this.get('route') + '/' + message.target : this.get('route');
    message.frequency = message.frequency.replace(/^\//, '').replace(/\//g, '.');
    return this;
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

  extract_container_id:function(path){
    return path.substring(this.get('path').length + 2);
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

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    eyes.inspect(req.toJSON());

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
  */
})