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
var log = require('logule').init(module, 'HTTP Router');
var SparkMonitor = require('../node/sparkmonitor');
var SocketCombo = require('./socketcombo');
var bouncy = require('bouncy');
var dye = require('dye');

module.exports = factory;
module.exports.closure = true;

function factory(options, callback){

  options || (options = {});

  var self = this;

  var db = options.db;

  var mainspark = null;

  var routes = {};

  function addroute(hostname, endpoint){
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

  var monitor = SparkMonitor({
    db:db,
    selector:'group#workers.webserver'
  })

  monitor.on('add', function(spark){

    var endpoints = spark.attr('endpoints');

    db('node=' + spark.attr('nodeid')).ship(function(node){
      _.each(node.attr('websites'), function(website){
        _.each(website.hostnames, function(hostname){
          addroute(hostname, endpoints.http);
        })
      })
    })
    
  })

  monitor.on('remove', function(spark){

    var endpoints = spark.attr('endpoints');

    db('node=' + spark.attr('nodeid')).ship(function(node){
      _.each(node.attr('websites'), function(website){
        _.each(website.hostnames, function(hostname){
          removeroute(hostname, endpoints.http);
        })
      })
    })

  })

  var server = bouncy(function (req, res, bounce) {

    var route = pickroute(req.headers.host);

    if(!route){
      res.statusCode = 404;
      res.end('no such host');
    }
    else{
      bounce(route);
    }
  })

  monitor.start(function(){

    log.info(dye.magenta('HTTP Router listening on port ' + dye.red(options.port)));

    server.listen(options.port);

    callback(null, server);
  })

}