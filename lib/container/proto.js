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
var helpers = require('./helpers');
var dataextractor = require('./dataextractor');
var Backbone = require('../vendor/backbone');
var BaseModel = require('./base');

var eyes = require('eyes');

var Container = module.exports = {};

/*


  Factory




 */

function factory(args, options){
  function instance(){
    instance.select.apply(instance, _.toArray(arguments));
  }
  _.extend(instance, Container);
  _.extend(instance, Backbone.Events);
  instance.fill(args, options);
  instance.stack = [];
  return instance;
}

Container.factory = factory;

/*
  The base model used for the models array

  This can be overriden to use a different 'attr' model of the users choosing

 */
Container.basemodel = BaseModel;

/*


  Constructor




 */

Container.configure = function(options){
  options || (options = {});
  this.options = options;
  if(options.attrmodel){
    this.basemodel = BaseModel.extend({
      attrmodel:options.attrmodel
    })
  }
  return this;
}

// this is called with the arguments containing the model data
Container.fill = function(args, options){
  var self = this;
  this.configure(options);
  this.models = _.map(dataextractor(args), function(containerdata){
    // if it is a backbone model - lets check if it's attributes or
    // the higher level wrapper
    if(containerdata.cid){
      // we are already a wrapper model just return
      if(containerdata._is_quarry_wrapper){
        return containerdata;
      }
      else{

      }
    }
    else{
      return new self.basemodel(containerdata);
    }
  })
  return this;
}

/*


  Model Accessors




 */

Container.get = function(index){
  return this.models[index];
}

Container.eq = function(index){
  return this.spawn(this.models[index]);
}

Container.spawn = function(){

  var ret = factory(_.toArray(arguments), this.options);
  
  // pass on the stack
  _.each(this.stack, function(fn){
    ret.use(fn);
  })

  return ret;
}


/*


  Overall Data




 */

Container.toJSON = function(){
  return _.map(this.models, function(model){
    return model.toJSON();
  })
}


/*


  Data accessors




 */

Container.attr = helpers.model('attr');
Container.meta = helpers.object('_meta');
Container.route = helpers.object('_route');

Container.quarryid = helpers.property('_meta.quarryid');
Container.tagname = helpers.property('_meta.tagname');
Container.id = helpers.property('_meta.id');
Container.classnames = helpers.property('_meta.classnames');

Container.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = model.get('_meta.classnames') || [];
    _.contains(self.get(0).get('_meta.classnames'), classname) ? null : classnames.push(classname);
    model.set('_meta.classnames', classnames);
  })
  return this;
}

Container.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.without(model.get('_meta.classnames'), classname);
    model.set('_meta.classnames', classnames);
  })
  return this;
}

Container.hasClass = function(classname){
   return this.models.length > 0 && _.contains(this.get(0).get('_meta.classnames'), classname);
}

Container.hasAttr = function(name){
  return this.models.length > 0 && this.get(0).attr.has(name);
}

Container.remoteAttr = function(name){
  _.each(this.models, function(model){
    model.attr.unset(name);
  })
  return this;
}

/*


  Stack




 */

// a basic version of the warehouse middleware stack
// this lets us have containers route to multiple warehouses (funky for later)
Container.use = function(fn){
  // have we been passed a whole warehouse or just a middleware function
  if ('function' == typeof fn.handle) {
    var server = fn;
    fn = function(req, res, next){
      server.handle(req, res, next);
    }
  }
  this.stack.push(fn);
  return this;
}
