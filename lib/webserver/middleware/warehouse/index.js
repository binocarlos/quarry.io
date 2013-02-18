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
var eyes = require('eyes');
var express = require('express');
var passport = require('passport');
var fs = require('fs');
var log = require('logule').init(module, 'API Middleware');
var dye = require('dye');
var url = require('url');

/*

  quarry.io - warehouse middleware

  gives the browser access to a supplychain connected back to reception

  similar to the API middleware but over socket.io rather than HTTP
  and so it's a full warehouse (with switchboard) implementation
  
*/


module.exports = function(options, system){

  return function(req, res, next){
    next();
  }

  /*
  return {
    configure:function(app){
      log.info(dye.yellow('Auth MIddleware config'));
      this.cookieParser = express.cookieParser(options.cookie.secret || 'rodneybatman');
      this.sessionStore = new RedisStore(system.worker.cache);
    },

    mount:function(app){

      var sessionSockets = new SessionSockets(app.io, this.sessionStore, this.cookieParser);
      sessionSockets.on('connection', function (err, socket, session) {
  //your regular socket.io code goes here
  //and you can still use your io object
});
    }
  }
  */
}