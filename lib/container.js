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

var Base = require('./container/base');
var Promise = require('./container/promise');
var searcher = require('./container/search');
var helpers = require('./container/helpers');
var xml = require('./container/xml');
var _ = require('underscore');
var async = require('async');

var eyes = require('eyes');

/*
  Quarry.io - Container
  ---------------------

  The main unit in the quarry.io stack

  A container provides a wrapper for a list of container base models

  Much like jQuery (which wraps DOM elements) - this wraps Backbone models

  Each base container has a supply chain & routing - it can stand alone

  

 */

module.exports = factory;

/*
  The prototype that wraps an array of container backbone models and proxies
  the functions down to the individual models (just like jquery)
 */

var Proto = {

  /*
    the array of underlying JSON data for container models
   */
  models:[],

  /*
    Lets us tell the difference between containers and supply chains
   */
  is_container:true,

  /*
    if the container has a warehouse then
   */
  _warehouse:null,

  /*



    Constructor



  */

  new: function(){

    var args = _.toArray(arguments).concat(this._warehouse);

    return factory.apply(null, args);
  },


  /*
    Get/set the warehouse used by this container
   */
  warehouse: function(){
    return arguments[0]!=null ? this._warehouse = arguments[0] : this._warehouse;
  },

  


  /*


    Events - we register our events on the warehouse so they are global
    this means that events from the backend warehouses will trigger these too : )

  */ 

  bind: function(event, callback){
    var self = this;
    console.log('BINDING');
    this.each(function(container){
      console.log('-------------------------------------------');
      console.log(container._warehouse);
      container._warehouse && container._warehouse.bind(container.quarryid(), event, callback);
    })
    return this;
  },

  trigger: function(){
    var self = this;
    var args = _.toArray(arguments);
    this.each(function(container){
      container._warehouse && container._warehouse.trigger.apply(container._warehouse, [container.quarryid()].concat(args));
    })
    return this;
  },

  unbind: function(event, callback){
    var self = this;
    this.each(function(container){
      container._warehouse &&  container._warehouse.unbind(container.quarryid(), event, callback);
    })
    return this;
  },

  unbind_all: function(){
    var self = this;
    this.each(function(container){
      container._warehouse &&  container._warehouse.unbind_all(container.quarryid());
    })
    return this;
  },


  /*



    Append



  */

  append:function(child){
    var self = this;
    if(_.isArray(child)){
      _.each(child, function(single_child){
        self.append(single_child);
      })
    }

    if(this.models.length==0){
      this.models = _.map(child.models, function(model){return model});
    }
    else{
      _.each(this.models, function(model){
        model.append(child.models);
      })  
    }

    return this;
  },

  appendTo:function(parent){
    parent.append(this);
    return this;
  },

  pourInto:function(target){
    target.append(this);
  },


  /*



    Find - this is an in-memory sync fake version of the backend warehouse
    search - the RAM supplier delegates it's select packets to here

  */

  find:function(){

    // use the search library to perform the reduction
    return searcher(this, _.toArray(arguments));
  },


  /*



    Factory workers

  */


  /*
    Create containers using the same warehouse as this one
   */
  spawn: function(models){
    if(!_.isArray(models)){
      models = _.isUndefined(models) ? [] : [models];
    }
    var ret = factory(this._warehouse);
    ret.models = models;
    return ret;
  },



  /*
    Turn the array of models into an array of stand-alone containers
   */
  containers: function(){
    var self = this;
    return _.map(this.models, function(model){
      return self.spawn(model);
    })
  },

  /*
    Merge all the children containers into a new one
   */
  children: function(){
    var self = this;
    var ret = [];
    
    _.each(this.models, function(model){
      ret = ret.concat(model.children());
    })

    return factory(ret, this._warehouse);
  },

  /*
    Recursviely merge all the children into a new container
   */
  descendents: function(){

    var ret = [];

    function add_model(model){
      ret.push(model);

      _.each(model.children(), add_model);
    }

    _.each(this.models, add_model);

    return factory(ret, this._warehouse);
  },

  /*
    Run a function over all descendents
   */
  recurse: function(fn){
    this.descendents().each(fn);
  },

  /*
    The parents are assigned by the children function inside the model
   */
  parent: function(){
    var self = this;
    var ret = [];
    
    _.each(this.models, function(model){
      model.parent ? ret.push(model.parent) : null;
    })

    return factory(ret, this._warehouse);
  },

  /*



    Model Accessors



  */

  get:function(at){
    return this.models[at];
  },

  first:function(){
    return this.eq(0);
  },

  last:function(){
    return this.eq(this.count()-1);
  },

  count:function(){
    return this.models.length;
  },

  eq:function(at){
    return this.spawn(this.get(at));
  },


  /*



    Data Accessors



  */  

  toJSON:function(){
    return _.map(this.models, function(model){
      return model.attributes;
    })
  },

  toXML:function(){
    return xml.toXML(this.toJSON());
  },

  // convert to XML without the children
  simpleXML:function(){
    return xml.toXML(_.map(this.toJSON(), function(data){
      var ret = _.extend({}, data);
      delete(ret._children);
      return ret;
    }));
  },

  /*



    Attribute getter/setters



  */

  /*
    base ATTR accessor
   */
  attr:function(){
    var self = this;
    var args = _.toArray(arguments);
    if(args.length<=0){
      return this.models.length<=0 ? {} : _.filter(this.models[0].attributes, function(val, key){
        return key!='_meta' && key!='_children';
      });
    }
    else if(args.length==1){
      if(_.isString(args[0])){
        return this.models.length>0 ? this.models[0].get(args[0]) : null;
      }
      else if(_.isObject(args[0])){
        _.each(self.models, function(model){
          model.set(args[0]);
        })
        return this;
      }
    }
    else if(args.length==2){
      if(this.models.length>0){
        this.models[0].set(args[0], args[1]);
      }

      return this;
    }    
  },

  removeAttr:helpers.wrapper({
    singular:function(container, args){
      if(_.isString(args[0])){
        container.unset(args[0]);
        return self;
      }
    }
  }),

  /*
    base META accessor
   */
  meta:helpers.wrapper({
    singular:helpers.object_attr('_meta')
  }),

  /*
    Tagname accessor
   */
  tagname:helpers.wrapper({
    singular:helpers.flat_attr('_meta.tagname')
  }),

  /*
    Summary accessor
   */
  summary:function(){
    return this.simpleXML().replace(/ quarryid=".*?"/, '').replace(/\n$/, '');
  },

  /*
    route accessor
   */
  hostname:helpers.wrapper({
    singular:helpers.flat_attr('_meta.hostname')
  }),

  protocol:helpers.wrapper({
    singular:helpers.flat_attr('_meta.protocol')
  }),

  /*
    QUARRYID accessor
   */
  quarryid:helpers.wrapper({
    singular:helpers.flat_attr('_meta.quarryid')
  }),

  /*
    Are we the root level warehouse (so we never include routing?)
   */
  is_warehouse:function(){
    return this.quarryid()=='warehouse';
  },

  /*
    ID accessor
   */
  id:helpers.wrapper({
    singular:helpers.flat_attr('_meta.id')
  }),

  /*
    classnames
   */
  classnames:helpers.wrapper({
    singular:helpers.flat_attr('_meta.classnames')
  }),

  classname_map:function(){
    var ret = {};
    _.each(this.classnames(), function(classname){
      ret[classname] = true;
    })
    return ret;
  },

  addClass:helpers.wrapper({
    singular:function(args){
      args || (args = []);
      var classnames = this.get('_meta.classnames') || [];
      if(args.length>0){
        // re-insert the class into the array
        classnames = _.without(classnames, args[0]);
        classnames.push(args[0]);
        this.set('_meta.classnames', classnames);
      }

      return this;
    }
  }),

  removeClass:helpers.wrapper({
    singular:function(args){
      args || (args = []);
      var classnames = this.get('_meta.classnames') || [];
      if(args.length>0){
        // re-insert the class into the array
        classnames = _.without(classnames, args[0]);
        this.set('_meta.classnames', classnames);
      }

      return this;
    }
  }),

  hasClass:function(){
    function single_has_class(container, args){
      var classnames = container.get('_meta.classnames');
      return args.length>0 && _.indexOf(classnames, args[0])>=0;
    }

    return this.models.length<=0 ? false : single_has_class(this.models[0], _.toArray(arguments));
  }    
}

// we can use either event model
Proto.on = Proto.bind;
Proto.emit = Proto.trigger;

function map_factory(underscore_method){

}

/*
  These are underscore methods that returns the original container
 */
var chain_methods = [
  'each',
  'forEach',
  'invoke'
]

/*
  These are underscore methods that return a direct primitive value
 */

var direct_methods = [

  'map',
  'all',
  'every',
  'some',
  'any',
  'contains',
  'include'


]

/*
  These are underscore methods that will return a reduced container set
 */
var map_methods = [
  
  'reduce',
  'reduceRight',
  'detect',
  'filter',
  'select',
  'reject',
  'max',
  'min',
  'sortBy'
]

_.each(chain_methods, function(chain_method){
  Proto[chain_method] = function(){
    var self = this;
    _[chain_method].apply(_, [self.containers()].concat(_.toArray(arguments)));
    return this;
  }
})

_.each(direct_methods, function(direct_method){
  Proto[direct_method] = function(){
    var self = this;
    return _[direct_method].apply(_, [self.containers()].concat(_.toArray(arguments)));
  }
})

_.each(map_methods, function(map_method){
  Proto[map_method] = function(){

    var self = this;

    // this becomes an array of containers
    var mapped_results = _[map_method].apply(_, [self.containers()].concat(_.toArray(arguments)));

    var mapped_models = _.map(mapped_results, function(mapped_result){
      return mapped_result.get(0);
    })

    return factory(mapped_models, self._warehouse);
  }
})


/*
  The container factory - this creates new containers with the given warehouse
 */
function factory(){

  var args = _.toArray(arguments);

  var warehouse = null;
  var model_data = [];

  function filter_arg(arg){
    if(!arg){
      return;
    }

    if(_.isString(arg)){
      // XML string
      if(arg.match(/^\s*</)){
        model_data = xml.fromXML(arg);
      }
      // JSON string
      else if(arg.match(/^[\[\{]/)){
        model_data = JSON.parse(arg);
      }
    }
    else if(_.isObject(arg) && arg.is_warehouse){
      warehouse = arg;
    }
    else if(_.isArray(arg)){
      model_data = arg;
    }
    else if(_.isObject(arg)){
      model_data = [arg];
    }
    
  }

  if(args.length==0){
    model_data = [{
      _meta:{}
    }]
  }
  else if(_.isString(args[0]) && _.isObject(args[1])){
    var model = args[1];
    model._meta || (model._meta = {});
    model._meta.tagname = args[0];
    model_data = [model];
  }
  else{
    filter_arg(args[0]);
    filter_arg(args[1]);
  }


  function strip_nulls(route){
    return route!=null;
  }

  function extract_meta(raw_model){
    return JSON.parse(JSON.stringify({
      '_meta':raw_model.get('_meta')
    }));
  }

  function model_factory(raw_data){
    return warehouse && _.isFunction(warehouse.container_factory) ? warehouse.container_factory.apply(warehouse, [raw_data]) : new Base(raw_data);
  }


  function make_results_container(raw_results){
    return factory(raw_results, warehouse);
  }

  /*
    The pointer to this array is passed all through container
    Change this array and the container's contents is changed

   */
  var models = _.map(model_data, function(raw_data){
    //lets check if it's a model already
    return raw_data.is_container_model ? raw_data : model_factory(raw_data);
  })

  /*
    The actual object we will return
   */
  function container(){
    var self = this;

    // what we pass as the basis of input for the branch
    var skeleton = _.filter(_.map(models, extract_meta), strip_nulls);

    // add each of the arguments onto a backwards pipe
    // this enables endless context switching
    var promise = new Promise(skeleton, warehouse);

    // setup the promise with a route to us for actually loading the data
    promise
      .loader(function(packet){

        if(!warehouse){
          promise.keep(make_results_container([]));
          return;
        }

        // run the warehouse proper
        warehouse.run(packet, function(response){

          var container_data = response.res.body() || [];

          if(!_.isArray(container_data)){
            if(_.isObject(container_data)){
              container_data = [container_data];
            }
            else{
              container_data = [{
                data:container_data
              }]
            }
          }

          // we now have the answer packet - res.body should be the raw data for our containers
          promise.keep(make_results_container(container_data));
        })
      })

    promise.selector_sequence(_.toArray(arguments));
    
    return promise;
  }

  _.extend(container, Proto);
  container.models = models;
  container.warehouse(warehouse);

  return container;  
}