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
var Portal = require('../portal/proto');
var Router = require('./router');
var Link = require('./link');

var Container = module.exports = function(){}

var log = require('logule').init(module, 'Container');

/*

  these are directly exposed as static methods
  
*/

Container.factory = factory;
Container.new = factory;

Container.fromskeleton = function(skeleton){
  var containerdata = [];

  if(skeleton){
    if(!_.isArray(skeleton)){
      skeleton = [skeleton];
    }

    containerdata = _.map(skeleton, function(data){
      return {
        meta:data
      }
    })
  }

  return factory(containerdata);
}

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
    model.children || (model.children = []);
    
    model.meta.quarryid || (model.meta.quarryid = utils.quarryid());

    /*
    
      a map of the attributes that are actually links

      this saves us traversing all of the stacks
      to find out (which would be slow)
      
    */
    model.links || (model.links = {});

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

  return the first containers meta data
  
*/
Container.prototype.skeleton = function(){

  return this.models.length>0 ? this.models[0].meta : {};
  
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

  return a new container with the given data

  the container is hooked up to the same supply chains as the spawner
  
*/
Container.prototype.spawn = function(models){
  var self = this;
  if(arguments.length<=0 || models==null){
    models = []
  }
  else if(!_.isArray(models)){
    models = [models];
  }

  _.each(models, function(model){
    if(!model.meta){
      throw new Error('there is no meta level to the container data - probably a skeleton passed as container data');
    }
    if(!model.meta.quarrysupplier){
      model.meta.quarrysupplier = self.quarrysupplier();
    }
  })

  var ret = factory(models);
  ret.supplychain = this.supplychain;

  return ret;
}

/*

  string summary
  
*/
Container.prototype.summary = function(){
  var ret = _.filter([this.tagname() ? '<' + this.tagname() + '>' : null, this.id() ? '#' + this.id() : null].concat(_.map(this.classnames(), function(classname){
    return '.' + classname;
  })).concat([this.attr('name') ? '"' + this.attr('name') + '"' : null]), function(st){
    return !_.isEmpty(st);
  }).join(' ');

  if(_.isEmpty(ret)){
    ret = this.quarryid();
  }

  return ret;
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

  iterate fn over each container
  
*/
Container.prototype.map = function(fn){
  return _.map(this.containers(), fn);
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
  this.each(function(container){
    map[container.quarryid()] = container;
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
  var self = this;
  var all_models = [];
  _.each(this.models, function(model){

    var router = Router(model.meta);

    /*
    
      ensure that the children have the same route as us
      (unless they already have one of their own)
      
    */
    var children = _.map(model.getChildren(), function(childmodel){

      var quarrysupplier = deepdot(childmodel, 'meta.quarrysupplier');
      if(!quarrysupplier){
        deepdot(childmodel, 'meta.quarrysupplier', router.quarrysupplier());
      }
      return childmodel;
    })
    all_models = all_models.concat(children);
  })
  var ret = this.spawn(all_models);
  ret.parent = this;
  return ret;
}

/*

  remove the models inside of the given container
  from our own child array
  
*/
Container.prototype.removechildren = function(removed){
  var self = this;
  var map = removed.containermap();
  _.each(this.models, function(model){
    model.children = _.filter(model.children, function(child_model){
      return map[child_model.meta.quarryid]==null;
    })
  })
  return this;
}

Container.prototype.remove = function(removed){
  var self = this;
  var map = removed.containermap();
  this.models = _.filter(this.models, function(model){
    return map[model.meta.quarryid]==null;
  })
  return this;
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

function valuereader(model, name){
  return deepdot(model, name);
}
function valuesetter(models, name, value){
  _.each(models, function(model){
    deepdot(model, name, value);
    if(name.indexOf('changed')!=0){
      model.changed || (model.changed = {});
      deepdot(model.changed, name, value);
    }
  })
}

function wrapper(key, options){

  options || (options = {});

  if(_.isString(options)){
    options = {
      leaf:options
    }
  }

  var leaf = options.leaf;
  var fullkey = leaf ? key + '.' + leaf : key;

  return function(){
    var self = this;

    /*
    
      READ
      -----
      wholesale getter of the object
      
    */
    if(arguments.length<=0){
      return valuereader(this.models[0], fullkey);
    }
    /*
    
      READ
      -----
      we are reading a first model value

    */
    else if(arguments.length==1 && _.isString(arguments[0]) && !leaf){
      return valuereader(this.models[0], [key, arguments[0]].join('.'));
    }
    /*
    
      WRITE
      -----
      we are setting an object
      
    */
    else if(arguments.length==1){
      var name = fullkey;
      valuesetter(this.models, fullkey, arguments[0]);
      return self;
    }
    /*
    
      WRITE
      -----
      we are setting a string value
      
    */
    else if(arguments.length>1){
      valuesetter(this.models, [fullkey, arguments[0]].join('.'), arguments[1]);
      return self;
    }
  }
  
}

var attrwrapper = wrapper('attr');

Container.prototype.attr = wrapper('attr');
Container.prototype.meta = wrapper('meta');
Container.prototype.changed = wrapper('changed');

Container.prototype.quarryid = wrapper('meta', 'quarryid');
Container.prototype.quarryportal = wrapper('meta', 'quarryportal');
Container.prototype.quarrysupplier = wrapper('meta', 'quarrysupplier');

Container.prototype.id = wrapper('meta', 'id');
Container.prototype.tagname = wrapper('meta', 'tagname');
Container.prototype.classnames = wrapper('meta', 'classnames');

Container.prototype.addClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.unique((deepdot(model, 'meta.classnames') || []).concat(classname));
    deepdot(model, 'changed.meta.classnames', classnames);
    deepdot(model, 'meta.classnames', classnames);
  })
  return this;
}

Container.prototype.removeClass = function(classname){
  var self = this;
  _.each(this.models, function(model){
    var classnames = _.without((deepdot(model, 'meta.classnames') || []), classname);
    deepdot(model, 'changed.meta.classnames', classnames);
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

Container.prototype.clean = function(){
  _.each(this.models, function(model){
    delete(model.changed);
  })
  return this;
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
  
    turn anything other than a function into the filter function

    the compiler looks after turning strings into selector objects
    
  */
  if(!_.isFunction(filterfn)){
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

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Routes and Portals
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

/*

  return a portal that is hooked up to the supplychain switchboard client

  (however it wants to look after the transport)
  
*/
Container.prototype.portal = function(){

  var portal = new Portal();

  if(this.supplychain){
    portal.attachcontainer(this);
  }

  return portal;
}

Container.prototype.get_switchboard = function(){
  if(!this.supplychain){
    return null;
  }
  return this.supplychain.switchboard || (this.supplychain.switchboardfactory ? this.supplychain.switchboardfactory() : null);
}

Container.prototype.router = function(){
  return Router(this.skeleton());
}

Container.prototype.link = function(field, container){

  /*
  
    return a link for this container
    
  */
  if(arguments.length<=0){
    return Link(this.router());
  }
  /*
  
    assume we mean to append a link to the children
    
  */
  else if(arguments.length==1){
    return this.append(container);
  }
  else if(arguments.length>=2){
    this.attr(field, container.attr());
    this.links[field] = container.link();
  }

  return this;
}


 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  API
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */


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
  
  var args = _.toArray(arguments);

  var json_selectors = _.map(args, function(selectorstring){
    return inspectselect(selectorstring);
  })

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - all the results back into a slurp
    
  */
  contract.setType('merge');

  /*
  
    we map multiparts and take their containers
    
  */
  contract.map_response = function(res){

    var results = [];

    _.each(res.flatten(), function(contractres){
      if(contractres.isContainers()){
        results = results.concat(contractres.body);
      }
    })
    
    return self.spawn(results);
  }

  this.each(function(container){

    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'get',
      url:container.router().rpc()
    })

    req.setHeader('x-json-selectors', json_selectors);

    contract.add(req);
  })

  return contract;
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

    childcontainer.recurse(function(descendent){
      delete(descendent.get(0).changed);
    })


    log.info('appending container: ' + childcontainer.summary());

    /*
    
      the models we replace in the child to represent the multiple models
      (perhaps) that now exist because of appending to a container with multiple
      things inside
      
    */
    var newchildmodels = [];

    self.each(function(parentcontainer){

      var parentmodel = parentcontainer.models[0];
      var route = parentcontainer.router().rpc();

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

    childcontainer.supplychain = self.supplychain;
    
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

    req.setHeader('content-type', 'quarry/containers');
    contract.add(req);
  })

  contract.on('ship', function(mainres){

    if(mainres.hasError()){
      log.error('response error: ' + mainres.body);
      return;
    }

    _.each(mainres.flatten(), function(res){

      if(res.hasError()){
        log.error('response error: ' + res.body);
        return;
      }

      var resultscontainer = self.spawn(res.body);

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

Container.prototype.save = function(){

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');


  /*
    
    now construct the contract representing what to add to each container
    
  */
  this.each(function(savecontainer){
    
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'put',
      url:savecontainer.router().rpc(),
      body:savecontainer.changed()
    })

    contract.add(req);
  })

  contract.on('ship', function(mainres){
    
  })

  return contract;
}

 /*

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  Delete
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------


 */

Container.prototype.delete = function(){

  var self = this;

  var contract = this.contractfactory();

  /*
  
    it's a merge contract - they can all append at the same time
    
  */
  contract.setType('merge');


  /*
    
    now construct the contract representing what to add to each container
    
  */
  this.each(function(savecontainer){
    
    /*
    
      now create the append request for the merge contract
      
    */

    var req = Contract.request({
      method:'delete',
      url:savecontainer.router().rpc()
    })

    contract.add(req);
  })

  contract.on('ship', function(mainres){
    self.models = [];
  })

  this.emit('delete');
  this.models = [];

  return contract;
}