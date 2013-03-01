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
var ThreadServer = require('../../../threadserver/server');
/*

  quarry.io - scripts middleware

  enables server-side quarry scripts to run inside a thread server
  
*/


module.exports = function(options, system){

  options || (options = {});

  _.each(['mount'], function(prop){
    if(!options[prop]){
      throw new Error('scripts middleware requires ' + prop + ' in the options');
    }
  })

  var mount = options.mount;

  var supplychain = system.supplychain;
  var switchboard = system.switchboard;

  var worker = system.worker;
  var codefolder = worker.stack.codefolder;

  var server = new ThreadServer({
    supplychain:supplychain,
    codefolder:codefolder
  })

  var projectroutes = options.routes.project;
  var warehouse = supplychain.connect(projectroutes["/"]);

  var script_root = options.script_root;

  return {
    mount:function(app){

      app.use(mount, function(req, res, next){

        var script_file = script_root + req.path;

        fs.readFile(script_file, 'utf8', function(error, content){

          if(error || !content){
            res.statusCode = 404;
            res.send(error);
            return;
          }

          server.script({
            projectroutes:projectroutes,
            fn:content,
            req:{
              url:req.url,
              method:req.method,
              query:req.query,
              headers:req.headers,
              body:req.body
            }
          }, function(error, result){

            if(error){
              res.statusCode = 500;
              res.send(error);
              return;
            }
            else{

              var qres = result.res;
              res.statusCode = qres.statusCode || 200;
              _.each(qres.headers, function(val, key){
                res.setHeader(val, key);
              })
              res.send(qres.body);
            }
            
          })


        })


      })
    }
  }

}