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
  Quarry.io - Container Helpers
  -----------------------------


 */

module.exports.property = property;
module.exports.model = model;
module.exports.object = object;

/*


  Helpers




 */

/*
  Accessor for a single property within the top-level backbone model

 */
function property(name){
  return function(){
    if(arguments.length>0){
      _.each(this.models, function(model){
        model.set(name, arguments[0]);
      })
      return this;
    }
    else{
      return this.models.length > 0 ? this.get(0).get(name) : null;
    }
  }
}

/*
  Accessor for a model within the base backbone model (like attr)

 */
function model(name){
  return function(){
    if(arguments.length>0){
      _.each(this.models, function(model){
        var usemodel = model[name];
        usemodel.set(name, arguments[0]);
      })
      return this;
    }
    else{
      return this.models.length > 0 ? this.get(0)[name].toJSON() : null;
    }
  }
}

/*
  Accessor for an object within the base model (like _meta)

 */
function object(name){
  return function(){
    if(arguments.length<=0){
      return this.models.length > 0 ? this.get(0).get(name) : null;
    }
    else if(arguments.length==1){
      if(_.isObject(arguments[0])){
        var setdata = {};
        _.each(arguments[0], function(v, k){
          setdata[name + '.' + k] = v;
        })
        _.each(this.models, function(model){
          model.set(setdata);
        })
        return this;
      }
      else{
        return this.models.length > 0 ? this.get(0).get(name + '.' + arguments[0]) : null;
      }
    }
    else if(arguments.length==2){
      var setdata = {};
      setdata[name + '.' + arguments[0]] = arguments[1];
      _.each(this.models, function(model){
        model.set(setdata);
      })
      return this;
    }
  }
}