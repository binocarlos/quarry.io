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