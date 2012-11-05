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
var utils = require('./utils');
var eyes = require('eyes');
var Container = require('../container');
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
  this.cache = {};
  this.options = options;
  this.backbonemodel(options.model);
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

  })
  fn && fn(root_container);
  return this;
}

/*


  Stack




 */

Warehouse.use = function(route, fn){
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
    };
  }

  // strip trailing slash
  if ('/' == route[route.length - 1]) {
    route = route.slice(0, -1);
  }

  // add the middleware
  //debug('use %s %s', route || '/', fn.name || 'anonymous');
  console.log('use: ' + (route || '/') + ' - ' + fn.name || 'anonymous');
  this.stack.push({ route: route, handle: fn });
  return this;
}

// run the request through the stack
Warehouse.handle = function(req, res, out) {
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
        if (res.headerSent) return req.socket.destroy();
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

    try {
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

      debug('%s', layer.handle.name || 'anonymous');
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
    } catch (e) {
      next(e);
    }
  }
  next();
};
/*


  Container Producer - takes container data and makes containers hooked
  up with this warehouse model and supply chains




 */
Warehouse.makecontainer = function(data){
  var container = this.container_factory(data);
  container.use(this);
  return container;
}
