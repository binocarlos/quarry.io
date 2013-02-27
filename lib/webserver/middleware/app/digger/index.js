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
var log = require('logule').init(module, 'Digger Middleware');
var dye = require('dye');
var url = require('url');
var express = require('express');
var Bootstrap = require('../../bootstrap');

/*

  quarry.io - bootstrap middleware

  delivers the quarry bootstrap API (a combo of Twitter Bootstrap and Google Angular)
  
*/


module.exports = function(options, system){

  options || (options = {});

  _.each(['mount'], function(prop){
    if(!options[prop]){
      throw new Error('bootstrap middleware requires ' + prop + ' in the options');
    }
  })

  var supplychain = system.supplychain;
  var mount = options.mount;

  /*
  
    the static serving middleware for all the bootstrap js / css
    
  */
  var bootstrap = Bootstrap();
    
  return {
    mount:function(app){

      var stackroute = app.options.routes.api;
      var warehouseroute = app.options.routes.warehouse;
      var warehouse = supplychain.connect(stackroute);

      app.use(mount, bootstrap);
      app.use(mount, express.static(__dirname + '/www'));
      

      /*
      
        get onto the directory index by default (appname/ not just appname)
        
      */
      app.get(mount, function(req, res, next){

        if(!req.originalUrl.match(/\/$/)){
          res.statusCode = 301;
          res.setHeader('Location', req.path + '/');
          res.end('Redirecting to ' + req.path + '/');
          return;
        }

        var origviews = app.get('views');
        app.set('views', __dirname + '/views');
        app.render('main', {          
          path:req.path.replace(/\/$/, ''),
          warehouse:warehouseroute
        }, function(error, content){
          res.send(content);
        })
        app.set('views', origviews);

      })

      
    }
  }

}