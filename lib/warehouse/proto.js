/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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
  , _ = require('lodash')
  , debug = function(message){
    //console.log('-------------------------------------------');
    //console.log(message);
  }

// prototype

var Warehouse = module.exports = function(){}

// environment

var env = process.env.NODE_ENV || 'development';

/**
 * Utilize the given middleware `handle` to the given `route`,
 * defaulting to _/_. This "route" is the mount-point for the
 * middleware, when given a value other than _/_ the middleware
 * is only effective when that segment is present in the request's
 * pathname.
 *
 * For example if we were to mount a function at _/admin_, it would
 * be invoked on _/admin_, and _/admin/settings_, however it would
 * not be invoked for _/_, or _/posts_.
 *
 * Examples:
 *
 *      var app = connect();
 *      app.use(connect.favicon());
 *      app.use(connect.logger());
 *      app.use(connect.static(__dirname + '/public'));
 *
 * If we wanted to prefix static files with _/public_, we could
 * "mount" the `static()` middleware:
 *
 *      app.use('/public', connect.static(__dirname + '/public'));
 *
 * This api is chainable, so the following is valid:
 *
 *      connect()
 *        .use(connect.favicon())
 *        .use(connect.logger())
 *        .use(connect.static(__dirname + '/public'))
 *        .listen(3000);
 *
 * @param {String|Function|Server} route, callback or server
 * @param {Function|Server} callback or server
 * @return {Server} for chaining
 * @api public
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
  debug('use ' + (route || '/') + ' ' + (fn.name || 'anonymous'));
  
  this.stack.push({ route: route, handle: fn });

  return this;
};

/*

  setup the method wrappers
  
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

/**
 * Handle server requests, punting them down
 * the middleware stack.
 *
 * @api private
 */

Warehouse.prototype.handle = function(req, res, out) {
  var stack = this.stack
    , fqdn = ~req.url.indexOf('://')
    , removed = ''
    , slashAdded = false
    , index = 0;

  function next(err) {
    var layer, path, status, c;

    if (slashAdded) {
      req.url = req.url.substr(1);
      slashAdded = false;
    }

    req.url = removed + req.url;
    req.originalUrl = req.originalUrl || req.url;
    removed = '';

    // next callback
    layer = stack[index++];

    // all done
    if (!layer || res.headerSent) {

      // delegate to parent
      if (out) return out(err);

      // unhandled error
      if (err) {
        // default to 500
        if (res.statusCode < 400) res.statusCode = 500;
        debug('default %s', res.statusCode);

        // respect err.status
        if (err.status) res.statusCode = err.status;

        // production gets a basic error message
        var msg = 'production' == env
          ? http.STATUS_CODES[res.statusCode]
          : err.stack || err.toString();

        // log to stderr in a non-test env
        if ('test' != env) console.error(err.stack || err.toString());
        //if (res.headerSent) return req.socket.destroy();
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', Buffer.byteLength(msg));
        if ('HEAD' == req.method) return res.end();
        res.end(msg);
      } else {
        debug('default 404');
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        if ('HEAD' == req.method) return res.end();
        res.end('Cannot ' + req.method + ' ' + utils.escape(req.originalUrl));
      }
      return;
    }

    //try {
      path = utils.parseUrl(req).pathname;

      if (undefined == path) path = '/';

      // skip this layer if the route doesn't match.
      if (0 != path.toLowerCase().indexOf(layer.route.toLowerCase())) return next(err);

      c = path[layer.route.length];
      if (c && '/' != c && '.' != c) return next(err);

      // Call the layer handler
      // Trim off the part of the url that matches the route
      removed = layer.route;
      req.url = req.url.substr(removed.length);

      // Ensure leading slash
      if (!fqdn && '/' != req.url[0]) {
        req.url = '/' + req.url;
        slashAdded = true;
      }

      debug(path + ' running ' + (!_.isEmpty(layer.handle.name) ? layer.handle.name : 'anonymous'));
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