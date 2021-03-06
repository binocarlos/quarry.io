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

  _.each(['mount', 'routes'], function(prop){
    if(!options[prop]){
      throw new Error('api middleware requires ' + prop + ' in the options');
    }
  })

  var supplychain = system.supplychain;
  var mount = options.mount;

  return {
    mount:function(app){

      var projectroutes = options.routes.project;

      var warehouse = supplychain.connect(projectroutes["/"]);

      app.use(mount, function(req, res, next){

        warehouse.rest({
          query:req.query,
          url:req.path,
          method:req.method.toLowerCase(),
          headers:_.extend({}, req.headers, {
            "x-json-quarry-user":req.user,
            "x-quarry-department":"api",
            "x-json-quarry-projectroutes":options.routes.project
          })
        })
        .ship(function(quarryres){

          quarryres.httpsend(res);

        })
      })
    }
  }

}