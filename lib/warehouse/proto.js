/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


// ORIGINAL CONNECT LICENSE
/*!
 * Connect - HTTPServer
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */


var utils = require('../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var Container = require('../container');

// prototype

var Warehouse = module.exports = function(){}

// environment

var env = process.env.NODE_ENV || 'development';

/*

  some warehouses need to get stuff ready before they start
  processing requests

    warehouse.prepare(function(finished){
      ... do stuff perhaps async
      finished();
    })
  
*/
Warehouse.prototype._prepared = true;
Warehouse.prototype._preparestack = [];
Warehouse.prototype.prepare = function(fn){
  var self = this;
  this._prepared = false;
  fn(function(){
    self._prepared = true;
    var callbacks = self._preparestack;
    self._preparestack = [];
    async.forEach(callbacks, function(fn, nextfn){
      fn();
      nextfn();
    }, function(){

    })
  })
}

/*

  a total ripoff of the connect middleware stack

 */

Warehouse.prototype.use = function(route, fn){
  // default route to '/'
  if ('string' != typeof route) {
    fn = route;
    route = '/';
  }

  // wrap sub-apps
  if ('function' == typeof fn.handle) {
    var server = fn;
    fn.route = route;
    fn = function(req, res, next){
      server.handle(req, res, next);
    };
  }

  /*
  if (fn instanceof http.Server) {
    fn = fn.listeners('request')[0];
  }
  */

  // strip trailing slash
  if ('/' == route[route.length - 1]) {
    route = route.slice(0, -1);
  }

  // add the middleware
  this.stack.push({ route: route, handle: fn });

  return this;
};

/*

  setup the method wrappers (express style)
  
*/
_.each(['head', 'get', 'post', 'put', 'delete'], function(method){
  Warehouse.prototype[method] = function(route, fn){

    if(!fn){
      fn = route;
      route = '/';
    }

    this.use(route, function(req, res, next){
      req.method==method ? fn(req, res, next) : next();
    })
  }
})

/*
 
  a total ripoff of the connect middleware handler

 */

Warehouse.prototype.handle = function(req, res, out) {
  var self = this;

  if(!this._prepared){
    this._preparestack.push(function(){
      self.handle(req, res, out);
    })
    return;
  }

  var stack = this.stack
    , fqdn = ~req.path.indexOf('://')
    , removed = ''
    , slashAdded = false
    , index = 0;

    /*
    
      see if this can free up the spinner
      
    */
  function next(err){
    process.nextTick(function(){
      actualnext(err);
    })
  }

  function actualnext(err) {
    var layer, path, status, c;

    if (slashAdded) {
      req.path = req.path.substr(1);
      slashAdded = false;
    }

    req.path = removed + req.path;
    if(!req.getHeader('x-quarry-fullpath')){
      req.setHeader('x-quarry-fullpath', req.path);
    }
    req.originalPath = req.originalPath || req.path;
    removed = '';

    // next callback
    layer = stack[index];
    index++;

    // all done
    if (!layer || res.headerSent) {

      // delegate to parent
      if (out) return out(err);

      // unhandled error
      if (err) {
        // default to 500
        if (res.statusCode < 400) res.statusCode = 500;

        // respect err.status
        if (err.status) res.statusCode = err.status;

        // production gets a basic error message
        var msg = 'production' == env
          ? http.STATUS_CODES[res.statusCode]
          : err.stack || err.toString();

        // log to stderr in a non-test env
        //if (res.headerSent) return req.socket.destroy();
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', Buffer.byteLength(msg));
        if ('HEAD' == req.method) return res.end();
        res.end(msg);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        if ('HEAD' == req.method) return res.end();
        res.end('Cannot ' + req.method + ' ' + utils.escape(req.originalPath));
      }
      return;
    }

    //try {

      path = req.path;

      if (undefined == path) path = '/';

      // skip this layer if the route doesn't match.
      if (0 != path.toLowerCase().indexOf(layer.route.toLowerCase())) return next(err);

      c = path[layer.route.length];
      if (c && '/' != c && '.' != c) return next(err);

      // Call the layer handler
      // Trim off the part of the url that matches the route
      removed = layer.route;
      req.path = req.path.substr(removed.length);

      // Ensure leading slash
      if (!fqdn && '/' != req.path[0]) {
        req.path = '/' + req.path;
        slashAdded = true;
      }

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
      //next(e);
    //}
  }
  next();
};

/*

  create a general container to hold the configuration for this supplier
  
*/
Warehouse.prototype.configure = function(options){
  this.config = Container.new('options', options);
  return this;
}