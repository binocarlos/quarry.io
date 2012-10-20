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

/*
  Quarry.io - Attribute Wrapper
  -----------------------------

  A function that returns an accessor for a subset of container data

 */

var api = {};

module.exports = api;

/*
  Generic factory for producing functions that look after applying the action across a list of containers
 */
api.wrapper = function(options){

  options || (options = {});
  _.defaults(options, {
    singular:function(){}
  })

  return function(){
    var self = this;
    var args = _.toArray(arguments);
    var models = self.models;

    // this is a getter - return the value of the first container model
    if(args.length<=0){
      return models.length>0 ? options.singular.apply(models[0], [[]]) : null;
    }
    // it is a setter - we apply it to each container
    else{
      _.each(models, function(model){
        options.singular.apply(model, [args]);
      })
      return self;
    }
  }
}

/*
  object attribute accessor - this assumes a base path
 */
api.object_attr = function(base_field){

  return function(args){
    var self = this;
    if(args.length<=0){
      return self.get(base_field);
    }
    else{
      var field = args[0];
      var value = args[1];

      var field_path = (_.isUndefined(base_field) ? [field] : [base_field, field]).join('.');

      if(_.isString(field)){
        return self.get(field_path);
      }
      else if(_.isObject(field)){
        _.each(field, function(val, field){
          self.set(field_path, val);
        })
        return self;
      }
    }
  }
}

/*
  single attribute accessor - it is passed the container and an arguments array
 */
api.flat_attr = function(field, def){

  return function(args){

    var self = this;
    if(args.length<=0){
      return self.get(field) || def;
    }
    else{
      self.set(field, args[0]);
      return self;
    }
  }
}
