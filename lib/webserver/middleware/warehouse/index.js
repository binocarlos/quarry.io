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
var Contract = require('../../../contract');

/*

  quarry.io - warehouse middleware

  gives the browser access to a supplychain connected back to reception

  similar to the API middleware but over socket.io rather than HTTP
  and so it's a full warehouse (with switchboard) implementation
  
*/


module.exports = function(middlewareoptions, system){

  var supplychain = system.supplychain;
  var switchboard = system.switchboard;

  return {
    configure:function(app){
      log.info(dye.yellow('Warehouse Middleware config'));
    },

    mount:function(app, callback){

      fs.readFile(system.codepath('/core/browser.js'), 'utf8', function(error, corecode){

        var config = {
          protocol:'http://',
          hostname:app.options.hostnames[0],
          socketid:app.options.socketid,
          stackpaths:middlewareoptions.quarryroutes
        }

        var route = middlewareoptions.mount;

        app.options.sockets.of('/' + app.options.socketid).on('connection', function(socket){

          var user = socket.handshake ? socket.handshake.user : null;

          var subscriptions = {};
          
          /*
          
            RECEPTION ENTRY POINT
            
          */
          socket.on('request', function(request, callback){
            request.headers["x-json-quarry-user"] = user;
            request.headers["x-quarry-department"] = 'api';
            supplychain.rpc(request, callback);
          })

          socket.on('subscription', function(routingkey, callback){
            if(subscriptions[routingkey]){
              return;
            }
            subscriptions[routingkey] = true;
            switchboard.listen(routingkey, function(message){
              socket.emit('broadcast', routingkey, message);
            })
          })

          socket.on('cancelsubscription', function(routingkey, callback){
            delete(subscriptions[routingkey]);
          })

          socket.on('broadcast', function(req, callback){
            
          })
        })

        app.get(route + '/warehouse.js', function(req, res, next){

          var socketscript = [config.protocol, config.hostname, "/socket.io/socket.io.js"].join('');
          var corescript = [config.protocol, config.hostname, route, '/core.js'].join('');

          var files = [socketscript, corescript];

          var code = '';

          _.each(files, function(file){
            code += 'document.write(\'<script type="text/javascript" src="' + file + '"></script>\');';
          })

          res.header('Content-Type', 'application/javascript');
          res.send(code);
          
        })

        /*
        
          inject the socket.io and core code ready for a page
          
        */
        app.get(route + '/core.js', function(req, res, next){


          var code = 'this.$quarryconfig = ' + JSON.stringify(config) + ";\n\n";
          code += corecode;
          code += [
            "(function(window){",
            "   var container = require('/lib/container/proto');",
            "   this.$quarry = container.prototype.bootstrapbrowser(window.$quarryconfig);",
            "})(this)"
          ].join("\n");

          res.header('Content-Type', 'application/javascript');
          res.send(code);
        })

        callback();

      })

    }
  }
  
}