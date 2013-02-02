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

var _ = require('lodash');
var eyes = require('eyes');

var EventEmitter = require('events').EventEmitter;
var deepdot = require('deepdot');
var inspectselect = require('inspectselect');
var find = require('./find');
var search = require('./search');
var XML = require('./xml');
var xtend = require('xtend');
var utils = require('../utils');
var Contract = require('../contract');
var Portal = require('./portal');

var Container = module.exports = function(){}

var log = require('logule').init(module, 'Container');

/*

  these are directly exposed as static methods
  
*/

Container.factory = factory;
Container.new = factory;

function factory(data, attr){
  var ensureids = false;
  if(_.isString(data)){
    // we assume XML
    if(data.match(/^\s*\</)){
      data = XML.parse(data);
      ensureids = true;
    }
    // or JSON string
    else if(data.match(/^\s*[\[\{]/)){
      data = JSON.parse(data);
    }
    // we could do YAML here
    else{
      data = [{
        meta:{
          tagname:data
        },
        attr:attr || {}
      }]
      ensureids = true;
    }
  }
  else if(!_.isArray(data)){
    data = [data];
  }

  function instance(){
    return instance.selector.apply(instance, arguments);
  }

  _.extend(instance, Container.prototype);
  _.extend(instance, EventEmitter.prototype);

  instance.initialize(data);

  if(ensureids){
    instance.ensure_ids();
  }

  return instance;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Model Array Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.initialize = function(data){
  var self = this;

  this.models = _.map(data || [], function(model){
    model.meta || (model.meta = {});
    model.meta.routes || (model.meta.routes = {});
    model.children || (model.children = []);
    model.meta.quarryid || (model.meta.quarryid = utils.quarryid());
    return model;
  })

  /*
  
    supplychain we use to fulfill contracts

    invariably - this is connected back to a warehouse or reception somewhere
    
  */
  this.supplychain = null;  

  return this;
}

/*

  make a copy with new ids (deep)
  
*/
Container.prototype.clone = function(){
  var ret = this.spawn(this.toJSON());

  ret.ensure_ids(true);

  return ret;
}
/*

  ensure a quarryid for each container (deep)
  
*/
Container.prototype.ensure_ids = function(force){
  this.recurse(function(container){
    _.each(container.models, function(model){
      model.meta || (model.meta = {});
      !model.meta.quarryid || force ? (model.meta.quarryid = utils.quarryid()) : null;
    })
  })
  return this;
}

/*

  return a copy of the models - for network transmission mostly
  
*/
Container.prototype.toJSON = function(){
  return JSON.parse(JSON.stringify(this.models));
}

/*

  string summary
  
*/
Container.prototype.summary = function(){

  return _.filter([this.tagname(), this.id(), this.attr('name'), this.quarryid()], function(st){
    return !_.isEmpty(st);
  }).join(' ');

}

/*

  model by index
  
*/
Container.prototype.get = function(index){
  return this.models[index];
}

/*

  container at index
  
*/
Container.prototype.eq = function(index){
  return this.spawn(this.get(index));
}

/*

  model by quarryid
  
*/
Container.prototype.byid = function(id){
  return _.find(this.models, function(model){
    return deepdot(model, 'meta.quarryid')==id;
  })
}

/*

  inject data into the existing container
  
*/
Container.prototype.inject = function(data){
  this.each(function(container){
    xtend(container.get(0), data);
  })
  return this;
}

/*

  return a new container with the given data

  the container is hooked up to the same supply chains as the spawner
  
*/
Container.prototype.spawn = function(models){
  if(arguments.length<=0 || models==null){
    models = []
  }
  else if(!_.isArray(models)){
    models = [models];
  }
  var ret = factory(models);
  ret.supplychain = this.supplychain;
  return ret;
}

/*

  add the models from the given container into this model array
  
*/
Container.prototype.add = function(container){
  var self = this;
  this.models = this.models.concat(container.models);
  return this;
}

/*

  the reverse of add i.e. we add these models to that
  
*/
Container.prototype.pourInto = function(target){
  target.add(this);
  return this;
}

/*

  how many models we have
  
*/
Container.prototype.count = function(){
  return this.models.length;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Model Array Iterators
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  iterate fn over each container
  
*/
Container.prototype.each = function(fn){
  _.each(this.containers(), fn);
  return this;
}

/*

  turn each model into it's own container (via spawn)
  and return the whole array
  
*/
Container.prototype.containers = function(){
  var self = this;
  return _.map(this.models, function(model){
    return self.spawn(model);
  })
}

/*

  return a map of this.containers() by their quarryid
  
*/
Container.prototype.containermap = function(){
  var map = {};
  _.each(this.containers(), function(container){
    map[Container.prototype.quarryid()] = container;
  })
  return map;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Children / Descendents
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  return container with the concatted contents of models.children
  
*/
Container.prototype.children = function(){
  var all_models = [];
  _.each(this.models, function(model){
    all_models = all_models.concat(model.getChildren());
  })
  var ret = this.spawn(all_models);
  ret.parent = this;
  return ret;
}

/*

  recurse over children and self
  
*/
Container.prototype.recurse = function(fn){
  this.descendents().each(fn);
  return this;
}

/*

  return a flat array of all descendent containers
  
*/
Container.prototype.descendents = function(){
  var all_models = [];
  function find_model(model){
    all_models.push(model);
    _.each(model.children, find_model);
  }

  _.each(this.models, find_model);

  return this.spawn(all_models);
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Property Accessors
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  generic wrapper function to handle our array of models via a single function

  
*/
function wrapper(key, shallow){
  return function(){
    var self = this;

    /*
    
      wholesale getter of the object
      
    */
    if(arguments.length<=0){
      return deepdot(this.models[0], key);
    }
    /*
    
      we are reading a first model value

    */
    else if(arguments.length==1 && !shallow){
      return deepdot(this.models[0], [key, arguments[0]].join('.'));
    }
    /*
    
      we are setting an object
      
    */
    else if(arguments.length==1){
      var val = arguments[0];
      _.each(this.models, function(model){
        deepdot(model, key, val);
      })
      return self;
    }
    /*
    
      we are setting a string value
      
    */
    else if(arguments.length>1){
      var name = [key, arguments[0]].join('.');
      var value = arguments[1];
      _.each(this.models, function(model){
        deepdot(model, name, value);
      })
      return self;
    }
  }
  
}

Container.prototype.attr = wrapper('attr');
Container.prototype.meta = wrapper('meta');

Container.prototype.id = wrapper('meta.id', true);
Container.prototype.quarryid = wrapper('meta.quarryid', true);
Container.prototype.tagname = wrapper('meta.tagname', true);
Container.prototype.classnames = wrapper('meta.classnames', true);
Container.prototype.routes = wrapper('meta.routes', true);

Container.prototype.portalkey = function(routingkey){

  var parts = ['container:' + this.route()];

  if(this.tagname()!='supplychain'){
    parts.push(this.quarryid());
  }

  if(routingkey!='*'){
    parts.push(routingkey);  
  }
  
  return parts.join('.');
}

Container.prototype.route = function(method, value){
  var routes = this.routes() || {};

  /*
  
    we prefer the actual method route

      routes.post

    these routes know exactly where to point

    the normal route is stamped by the supplier

    otherwise the route is /quarryid
    
   */

  if(arguments.length>=2){
    routes[method] = value;
    this.routes(routes);
  }

  return routes[method] || routes.normal || ('/' + this.quarryid());
}

Container.prototype.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.unique((deepdot(model, 'meta.classnames') || []).concat(classname));
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.without((deepdot(model, 'meta.classnames') || []), classname);
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.hasClass = function(classname){
   return _.contains((this.classnames() || []), classname);
}

Container.prototype.hasAttr = function(name){
  return !_.isEmpty(this.attr(name));
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Local Interface
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  wrap up our selector resolver with the basic search function
  
*/
var finder = find(search.searcher);

Container.prototype.find = function(){
  var selector_strings = _.toArray(arguments);

  var selectors = _.map(selector_strings, inspectselect);

  return finder(selectors, this);
}

/*

  run the filter function over each container individually
  and return a container with the ones that passed (by return true classic filter style)
  
*/
Container.prototype.filter = function(filterfn){

  /*
  
    we assume it's a selector string to turn into a compiled function
    
  */
  if(_.isString(filterfn)){
    filterfn = search.compiler(filterfn);
  }

  var matching_container_array = _.filter(this.containers(), filterfn);

  var matching_models = [];
  _.each(matching_container_array, function(matching_container){
    matching_models = matching_models.concat(matching_container.models);
  })

  return this.spawn(matching_models);
}

/*

  runs a single selector against this container to see if we have a match
  for ourselves - we always pluck the first model
  
*/
Container.prototype.match = function(selector){

  if(this.count()<=0){
    return false;
  }

  var selectors = inspectselect(selector);
  var selector = selectors[0][0];

  var results = this.filter(selector);

  return results.count()>0;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Network Interface
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  return a portal that is hooked up to the supplychain switchboard client

  (however it wants to look after the transport)
  
*/
Container.prototype.portal = function(){

  var portal = new Portal(this, this.supplychain ? this.supplychain.switchboard : null);

  return portal;
}

/*

  make a new contract that has the same supply chain handle
  as the container
  
*/
Container.prototype.contractfactory = function(){
  var contract = Contract.factory();
  contract.supplychain = this.supplychain;
  return contract;
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Selector
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.selector = function(){
  console.log('-------------------------------------------');
  console.log('running selector');
}

/*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Append
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

// ensure ids on appended models
function childmodelmap(childmodel){
  var ret = JSON.parse(JSON.stringify(childmodel));
  ret.meta.quarryid = utils.quarryid();
  return ret;
}

Container.prototype.append = function(childcontainers){

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');

  /*
  
    a map of request url onto body data
    
  */
  var append_requests = {

  }

  /*
  
    a flat map of all models we are sending so we can update their attr once saved
    
  */
  var update_containers = {

  }

  /*

    we copy the models for each of our containers changing
    the id each time

    each container added to each parent is effectively a new model
    whatever the old id was

   */  
  function append_single_container(childcontainer){

    log.info('appending container: ' + childcontainer.summary());
    /*
    
      the models we replace in the child to represent the multiple models
      (perhaps) that now exist because of appending to a container with multiple
      things inside
      
    */
    var newchildmodels = [];

    self.each(function(parentcontainer){

      var parentmodel = parentcontainer.models[0];

      var route = parentcontainer.route('post');

      var append = childcontainer.clone();

      /*
      
        make sure all models have new ids (deep)
        
      */
      append.ensure_ids(true);

      parentmodel.children || (parentmodel.children = []);
      parentmodel.children = parentmodel.children.concat(append.models);

      newchildmodels = newchildmodels.concat(append.models);

      append_requests[route] || (append_requests[route] = []);
      append_requests[route] = append_requests[route].concat(append.models);
    })

    /*
    
      remap the in-memory container so it has a copy of each appended model
      
    */
    childcontainer.models = newchildmodels;

    childcontainer.recurse(function(descendent){
      update_containers[descendent.quarryid()] = descendent;
    })


  }

  /*
  
    run the append containers through the mapper
    
  */
  childcontainers = _.isArray(childcontainers) ? childcontainers : [childcontainers];
  
  _.each(childcontainers, append_single_container);

  /*
    
    now construct the contract representing what to add to each container
    
  */
  _.each(append_requests, function(data, route){
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'post',
      url:route,
      body:data
    })

    contract.add(req);
  })

  contract.on('ship', function(mainres){

    _.each(mainres.flatten(), function(res){

      var resultscontainer = Container.new(res.body);

      resultscontainer.recurse(function(resultsdescendent){

        var realcontainer = update_containers[resultsdescendent.quarryid()]

        if(!realcontainer){
          log.error('container update not found: ' + resultsdescendent.summary());
        }
        else{
          var model = resultsdescendent.get(0);
          realcontainer.inject(model);
        }
                
      })

    })
    
  })

  return contract;
}
  
 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Save
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Delete
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */