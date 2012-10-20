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
var contractFactory = require('./warehouse/contract');
var searcher = require('./container/search');
var packetFactory = require('./packet');
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
    the default warehouse is just a loopback
   */
  _warehouse:null,

  /*



    Constructor



  */ 

  /*
    Map the array of raw model data onto actual models
   */
  initialize: function(data){
    var self = this;
    self.models = _.map(data, function(raw_data){
      //lets check if it's a model already
      return raw_data._quarrycontainer ? raw_data : self.model_factory(raw_data);
    })
    return this;
  },

  /*
    Turn a raw object into a proper container model
   */
  model_factory:function(raw_data){
    return this._warehouse && _.isFunction(this._warehouse.container_factory) ? this._warehouse.container_factory.apply(this._warehouse, [raw_data]) : new Base(raw_data);
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
    this.each(function(container){
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
    _.each(this.models, function(model){
      model.append(child.models);
    })
    return this;
  },

  appendTo:function(parent){
    parent.append(this);
    return this;
  },


  /*



    Find - this is an in-memory sync fake version of the backend warehouse
    search - the RAM supplier delegates it's select packets to here

  */

  find:function(){

    var contract = contractFactory();

    // map each selector string as a branch (in reverse)
    _.each(_.toArray(arguments).reverse(), _.bind(contract.selector, contract));

    var contract_packet = packetFactory.contract(contract.toJSON());

    // use the search library to perform the reduction
    return searcher(this, contract_packet);
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

  toJSON:function(){
    return _.map(this.models, function(model){
      return model.toJSON();
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
    protocol accessor
   */
  protocol:helpers.wrapper({
    singular:helpers.flat_attr('_meta.route.protocol')
  }),

  /*
    host accessor
   */
  host:helpers.wrapper({
    singular:helpers.flat_attr('_meta.route.host')
  }),

  /*
    route accessor
   */
  route:helpers.wrapper({
    singular:helpers.flat_attr('_meta.route')
  }),

  /*
    URL accessor
   */
  url:function(){
    return '/' + this.protocol() + '/' + this.host() + '/' + this.quarryid();
  },

  /*
    QRL accessor
   */
  qrl:function(){
    return this.protocol() + '://' + this.host() + '/' + this.quarryid();
  },

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
  'map',
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

  function extract_warehouse(){
    return _.isFunction(args[1]) ? args[1] : (_.isFunction(args[0]) && !args[0]._iscontainer ? args[0] : null);
  }

  function extract_model_data(){

    /*
      This is a factory for a single container with the given tagname
      Or it's XML data
     */
    if(_.isString(args[0])){

      var string = args[0];

      // if it has left angle bracket at the start then it's XML
      if(string.match(/^</)){
        
        return xml.fromXML(string);
      }
      else{
        return args.length<=0 ? [{}] : [{
          _meta:{
            tagname:args[0]
          }
        }]  
      }
    }
    /*
      This is a list of raw model data
     */
    else if(_.isArray(args[0])){
      return args[0];
    }
    /*
      This is either an existing container or a warehouse
     */
    else if(_.isFunction(args[0])){

      return args[0]._iscontainer ? args[0] : [{}];
    }
    /*
      This is raw container data for one container
     */
    else if(_.isObject(args[0])){
      return [args[0]];
    }
    /*
      This is the blank container
     */
    else{
      return [{}];
    }
  }

  /*
    The actual object we will return
   */
  function container(){
    var self = this;

    // add each of the arguments onto a backwards pipe
    // this enables endless context switching
    var promise = new Promise();

    // setup the promise with a route to us for actually loading the data
    promise
      .loader(function(contract, callback){

        // the default warehouse just routes the packet back right away
        // it fakes an empty result
        var warehouse = self.warehouse() || function(packet, callback){

          // we fake a load time to give them a chance to setup the promise
          async.nextTick(function(){
            callback(null, packet);  
          })
          
        }

        var contract_packet = packetFactory.contract(contract.toJSON());

        // we stamp it unless it's the very top
        if(!self.is_warehouse()){
          contract_packet.stamp(self);
        }

        // run the warehouse proper
        self._warehouse(contract_packet.toJSON(), function(answer){

          // we now have the answer packet - res.body should be the raw data for our containers
          promise.keep(factory(packet.res.body, warehouse));

        })
      })

    _.each(_.toArray(arguments).reverse(), function(arg){
      promise.selector(arg);
    })

    return promise;
  }

  _.extend(container, Proto);

  container.warehouse(extract_warehouse());
  container.initialize(extract_model_data());

  return container;  
}