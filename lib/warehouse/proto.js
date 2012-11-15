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
var Container = require('../container');
var queryFactory = require('../query/factory');
var queries = queryFactory();
//var Proto = require('./proto');

var Warehouse = module.exports = {};


/*
  Quarry.io - Warehouse
  ---------------------

  The main co-ordinating class for dealing with packets

  The warehouse is basically a router for supply chains

  It presents a middleware stack

  You add middleware based on a route - the packet.route is used

  The middleware is a

    function(req, res, next)

  It does not think about the packet

  the request and response are hooked up by the warehouse

  The warehouse will have supply chains associated with it which packets can be routed to


 */

/*


  Constructor




 */

Warehouse.initialize = function(options){
  options || (options = {});
  this.stack = [];
  this.loadingstack = [];
  this.isloading = false;
  this.cache = {};
  this.options = options;
  this.backbonemodel(options.model);
  this.supplychain = null;
  return this;
}

// pass a backbone model to use for the container attr
// any container produced from this warehouse will use this model
Warehouse.backbonemodel = function(model){
  this.container_factory = Container({
    basemodel:model
  })
  return this;
}

// make a container routing to the top of this warehouse
// and pass it into the contstructor
Warehouse.ready = function(fn){

  var root_container = this.container_factory('warehouse', {

  }).setRoute({
    // this sets the container as the root (default project) warehouse
    'path':'/reception/default'
  })

  // hook up the container to use this warehouse
  root_container.use(this);
  
  fn && fn(root_container);
  return this;
}

/*


  Stack




 */

// preapre the stack entry but don't insert it
// this allows us to wrap the function before inserting it
Warehouse.get_stack_entry = function(route, fn){
  var self = this;
  // default route to '/'
  if ('string' != typeof route) {
    fn = route;
    route = '/';
  }

  // wrap sub-warehouses
  if ('function' == typeof fn.handle) {
    var server = fn;
    fn.route = route;
    fn = function(req, res, next){
      server.handle(req, res, next);
    }
  }

  // strip trailing slash
  if ('/' == route[route.length - 1]) {
    route = route.slice(0, -1);
  }

  return { route: route, handle: fn };
}

Warehouse.usebefore = function(route, fn){
  var entry = this.get_stack_entry(route, fn);
  this.stack.unshift(entry);
  return this;
}

Warehouse.use = function(route, fn){
  if(!route && !fn){
    throw new Error('There must be a function or a route');
  }
  var entry = this.get_stack_entry(route, fn);
  this.stack.push(entry);
  return this;
}

// add a stack function but only if the request method is the same
_.each(['head', 'get', 'post', 'put', 'delete'], function(verb){
  Warehouse[verb] = function(route, fn){
    var self = this;
    var entry = this.get_stack_entry(route, fn);
    var orig_fn = entry.handle;
    entry.handle = function(req, res, next){
      if(req.method().toLowerCase()!=verb){
        next();
        return;
      }
      orig_fn(req, res, next);
    }
  }
})

// the RPC entry point for a request
Warehouse.request = function(req, callback){
  var res = queries.response();
  res.on('send', function(){
    callback(res);
  })
  this.handle(req, res);
}

// run the request through the stack
Warehouse.handle = function(req, res, out) {
  var self = this;
  var stack = this.stack
    , removed = ''
    , index = 0;

  /*
  
    Proxy the request events so the supply chain hears them

   */

  if(this.isloading){
    this.loadingstack.push(function(){
      self.handle(req, res, out);
    })
    return;
  }

  function next(err) {
    var layer, path, status, c;

    req.path(removed + req.path());
    req.originalPath(req.originalPath() || req.path());
    removed = '';

    // next callback
    layer = stack[index++];

    // all done
    if (!layer || res.sent) {
      // delegate to parent
      if (out) return out(err);

      res.header('Content-Type', 'text/plain');

      // unhandled error
      if (err){
        res.status(500);
        res.send(err);
      } else {
        res.status(404);
        res.send('cannot find (' + req.method() + ') ' + req.path());
      }
      
      return;
    }

    //try {
      path = req.path();
      if (undefined == path) path = '/';

      // skip this layer if the route doesn't match.
      if (0 != path.toLowerCase().indexOf(layer.route.toLowerCase())) return next(err);

      // Call the layer handler
      // Trim off the part of the url that matches the route
      removed = layer.route;
      req.path(req.path().substr(removed.length));

      var arity = layer.handle.length;
      if (err) {
        if (arity === 4) {
          layer.handle(err, req, res, next);
        } else {
          next(err);
        }
      } else if (arity < 4) {
        layer.handle(req, res, next);
      } else {
        next();
      }
    //} catch (e) {
    //  next(e);
    //}
  }
  next();
};

/*


  Container Producer - takes container data and makes containers hooked
  up with this warehouse model and supply chains




 */
Warehouse.makecontainer = function(data){
  var container = this.container_factory(data);

  // the warehouse router is the first in the stack
  // it automatically calls next however
  container.use(this);
  
  return container;
}

/*

  Wait for the loader function before we run any requests

 */
Warehouse.prepare = function(loader){
  var self = this;
  self.isloading = true;
  loader(function(){
    self.isloading = false;
    _.each(self.loadingstack, function(loadedcallback){
      loadedcallback();
    })
  })
  return this;
}