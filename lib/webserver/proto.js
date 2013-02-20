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
var async = require('async');
var utils = require('../utils');
var eyes = require('eyes');
var EventEmitter = require('events').EventEmitter;
var express = require('express');
var Website = require('./website');
var http = require('http');
var socketio = require('socket.io');
var log = require('logule').init(module, 'Web Server');
var util = require('util');
var path = require('path');
var dye = require('dye');
var RedisStore = require('./tools/redisstore')(express);
var passportSocketIo = require('passport.socketio');
//var Proto = require('./proto');

module.exports = Webserver;

function Webserver(options, system){
  EventEmitter.call(this);
  var self = this;
  
  this.options = options;
  this.system = system;
  
  if(!this.options){
    throw new Error('Webserver needs options');
  }

  if(!this.system){
    throw new Error('Webserver needs system');
  }

  _.each(['supplychain', 'cache', 'endpoint', 'worker'], function(prop){
    if(!system[prop]){
      throw new Error('Webserver needs a ' + prop);
    }
  })

  /*
  
    map of id onto website
    
  */
  this.websites = {};

  /*
  
    map of domain onto website
    
  */

  this.domains = {};

  /*
  
    the HTTP server hosting the router app
    
  */
  this.server = http.createServer(function(req, res){
    var hostname = req.headers.host.toLowerCase();
    var app = self.domains[hostname];

    function notfound(){
      res.statusCode = 404;
      res.end(req.url + ' not found');
    }

    app ? app(req, res, notfound) : notfound();
  })

  /*
  
    the server socket io that will use namespaces for virtual hosts
    
  */
  this.io = socketio.listen(this.server);

  if(process.env.NODE_ENV=='production'){
    this.io.enable('browser client minification');
    this.io.enable('browser client etag');
    this.io.enable('browser client gzip');
  }
  
  this.io.set('log level', 1);
  this.io.set('transports', [
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ])

  this.cookieSecret = 'rodneybatman';
  this.cookieParser = express.cookieParser(this.cookieSecret);
  this.sessionStore = new RedisStore(system.worker.cache);

  this.io.set('authorization', passportSocketIo.authorize({
    key:'connect.sid',
    secret:this.cookieSecret,
    store:this.sessionStore,
    fail:function(data, accept){
      accept(null, true);
    },
    success:function(data, accept) {
      accept(null, true);
    }
  }))

  //this.sockets = sessionSockets = new SessionSockets(this.io, this.sessionStore, this.cookieParser);
  this.sockets = this.io;
}

util.inherits(Webserver, EventEmitter);

Webserver.prototype.addwebsite = function(website_config, ready_callback){
  var self = this;

  _.extend(website_config, {
    document_root:path.resolve(this.system.worker.stack.codefolder, website_config.document_root),
    sessionStore:this.sessionStore,
    cookieSecret:this.cookieSecret,
    cookieParser:this.cookieParser,
    socketid:utils.littleid(),
    sockets:this.sockets
  })
  
  log.info('Mounting Website: ' + dye.red(website_config.name) + ' - ' + dye.yellow(website_config.document_root));

  var website = new Website(website_config);

  website.initialize(self.system, function(error){
    if(error){
      next_website(error);
      return;
    }

    self.websites[website.hostname()] = website;  

    _.each(website.hostnames(), function(hostname){
      log.info('Mapping domain: ' + dye.yellow(hostname));
      self.domains[hostname.toLowerCase()] = website.app;
    })

    ready_callback();
  })
}

Webserver.prototype.bind = function(ready_callback){
  var self = this;

  log.info('web server binding on port: ' + dye.red(self.system.endpoint.port));

  self.server.listen(self.system.endpoint.port, function(){
    ready_callback();
  })

}

Webserver.prototype.load_websites = function(loaded_callback){
  var self = this;

  async.series([

    /*
    
      now each website
      
    */
    function(next){
      async.forEach(self.options.websites || [], function(website_config, next_website){
        
        self.addwebsite(website_config, next_website);

      }, next)
    }

  ], loaded_callback)
  
}