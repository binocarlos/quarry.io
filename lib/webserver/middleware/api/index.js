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

  quarry.io - api middleware

  the HTTP to quarry protocol bridge
  
*/


module.exports = function(options, system){

  options || (options = {});

  _.each(['mount', 'quarryroutes'], function(prop){
    if(!options[prop]){
      throw new Error('api middleware requires ' + prop + ' in the options');
    }
  })

  var supplychain = system.supplychain;
  var mount = options.mount;

  return {
    mount:function(app){
      if(_.isString(options.quarryroutes)){
        options.quarryroutes = {
          "/":options.quarryroutes
        }
      }

      _.each(_.keys(options.quarryroutes).sort().reverse(), function(webroute){

        var apiroute = options.quarryroutes[webroute];
        var path = webroute == '/' ? mount : mount + webroute;

        var warehouse = supplychain.connect(apiroute);

        app.use(path, function(req, res, next){

          warehouse.rest({
            query:req.query,
            path:req.path,
            method:req.method.toLowerCase(),
            headers:_.extend({}, req.headers, {
              "x-json-quarry-user":req.user
            })
          })
          .debug(true)
          .ship(function(quarryres){

            quarryres.httpsend(res);

          })
        })
      })
    }
  }

}