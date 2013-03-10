/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var util = require('util');
var utils = require('../../../utils');
var Device = require('../../device');
var deck = require('deck');
var httpProxy = require('http-proxy');
var http = require('http');

module.exports = factory;

/*
  Quarry.io - HTTP Proxy
  ----------------------

  Simple HTTP server that emits request routing and expects a URL to proxy it to

 */

function factory(options){

  var routes = {};

  function addroute(hostname, endpoint){
    routes[hostname] || (routes[hostname] = []);
    routes[hostname].push(endpoint);
  }

  function removeroute(hostname, endpoint){
    routes[hostname] = _.filter(routes[hostname] || [], function(route){
      return route.hostname!=endpoint.hostname && route.port!=endpoint.port;
    })
  }

  function pickroute(hostname){
    return deck.pick(routes[hostname] || []);
  }

  var proxy = new httpProxy.RoutingProxy();

  var router = http.createServer(function (req, res) {
    var route = (options.pickroute || pickroute).apply(null, [req.headers.host]);
    if(!route){
      res.statusCode = 404;
      res.end('no such host');
    }
    else{
      proxy.proxyRequest(req, res, route);
    }
  })

  router.on('upgrade', function(req, socket, head) {
    var route = (options.pickroute || pickroute).apply(null, [req.headers.host]);
    if(!route){
      res.statusCode = 404;
      res.end('no such host');
    }
    else{
      proxy.proxyWebSocketRequest(req, socket, head, route);
    }
  })

  router.add = addroute;
  router.remove = removeroute;

  return router;
}