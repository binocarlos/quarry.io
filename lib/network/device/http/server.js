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
var path = require('path');

var http = require('http');
var socketio = require('socket.io');
var express = require('express');
var RedisStore = require('./tools/redisstore')(express);
var passportSocketIo = require('passport.socketio');


var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - HTTP Server
  -----------------------

  Full fledged web-server running as a job

  The web-server can host multiple websites - each represented as a task

  Each web-site task has it's own tasks representing middleware

 */

function factory(options){

  if(!options.cache){
    throw new Error('HTTP webserver needs a cache')
  }

  var webserver = Device('core.box', {
    name:options.name || 'Webserver'
  })

  /*
    map of id onto website
    
  */
  var websites = {};

  /*
  
    map of domain onto website
    
  */
  var domains = {};

  /*
  
    functions to clear a website from the routing table (by website id)
    
  */
  var removefns = {};

  var server = http.createServer(function(req, res){
    var hostname = req.headers.host.toLowerCase();
    var appid = domains[hostname];
    var app = websites[appid];

    function notfound(){
      res.statusCode = 404;
      res.end(req.url + ' not found');
    }

    app ? app(req, res, notfound) : notfound();
  })

  var io = socketio.listen(server);

  if(process.env.NODE_ENV=='production'){
    io.enable('browser client minification');
    io.enable('browser client etag');
    io.enable('browser client gzip');
  }
  
  io.set('log level', 1);
  io.set('transports', [
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ])

  var cookieSecret = 'rodneybatman';
  var cookieParser = express.cookieParser(cookieSecret);
  var sessionStore = new RedisStore(options.cache);

  io.set('authorization', passportSocketIo.authorize({
    key:'connect.sid',
    secret:cookieSecret,
    store:sessionStore,
    fail:function(data, accept){
      accept(null, true);
    },
    success:function(data, accept) {
      accept(null, true);
    }
  }))

  /*
  
    add a website to the webserver

    app is an express application

    we will route to it based on the provided domains
    
  */
  webserver.add_website = function(id, domains, app){
    websites[id] = app;

    _.each(domains || [], function(domain){
      domains[domain] = id;
    })

    removefns[id] = function(){
      _.each(domains || [], function(domain){
        delete(domains[domain]);
      })
      delete(removefns[id]);
    }
  }

  /*
  
    remove a website from this webserver

    this removes the server from our routing table
    
  */
  webserver.remove_website = function(id){
    removefns[id] && (removefns[id]());
  }

  return webserver;
}