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
var log = require('logule').init(module, 'HTTP Server');
var dye = require('dye');
var express = require('express');
var http = require('http');

module.exports = factory;
module.exports.closure = true;

function factory(options, callback){

  options || (options = {});

  var router = express();

  router.use(express.query());
  router.use(express.bodyParser());

  /*
  
    the HTTP server hosting the router app
    
  */
  var server = http.createServer(router);

  router.bind = function(ready_callback){

    log.info(options.title + ' binding on port: ' + dye.red(options.port));

    server.listen(options.port, function(){
      ready_callback();
    })
  }

  callback(null, router);


}