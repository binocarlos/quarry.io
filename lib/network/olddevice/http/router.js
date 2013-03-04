/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var _ = require('lodash');
var deck = require('deck');
var httpProxy = require('http-proxy');
var http = require('http');

var SparkMonitor = require('../node/sparkmonitor');

module.exports = factory;
module.exports.closure = true;

/*

  db: the system db
  
*/
function factory(options, callback){

  options || (options = {});

  var self = this;

  var db = options.db;

  var mainspark = null;

  var routes = {};

  function addroute(hostname, endpoint){
    if(!endpoint.host){
      endpoint.host = endpoint.hostname;
    }

    log.info(dye.magenta('HTTP Route:  ' + dye.red(hostname)));
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

  /*
  
    monitor any sparks for webserver nodes
    
  */
  var monitor = SparkMonitor({
    db:db,
    selector:'workers.webserver'
  })

  /*
  
    a new webserver has been booted
    
  */
  function handlespark(spark, fn){

    var id = spark.attr('nodeid');
    var endpoints = spark.attr('endpoints');

    db('node=' + id + ':tree').ship(function(node){
      node.find('service').each(function(website){
        _.each(website.attr('hostnames') || [], function(hostname){
          fn(hostname, endpoints.http);
        })
      })
    })
  }

  monitor.on('add', function(spark){
    handlespark(spark, addroute);
  })

  monitor.on('remove', function(spark){
    handlespark(spark, removeroute);
  })

  var proxy = new httpProxy.RoutingProxy();

  var router = http.createServer(function (req, res) {
    var route = pickroute(req.headers.host);
    if(!route){
      res.statusCode = 404;
      res.end('no such host');
    }
    else{
      proxy.proxyRequest(req, res, route);
    }
  })

  router.on('upgrade', function(req, socket, head) {
    var route = pickroute(req.headers.host);
    if(!route){
      res.statusCode = 404;
      res.end('no such host');
    }
    else{
      proxy.proxyWebSocketRequest(req, socket, head, route);
    }
  })

  monitor.start(function(){
    router.listen(options.port);
    callback(null, router);
  })

}