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
var express = require('express');
var log = require('logule').init(module, 'Website');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var dye = require('dye');
var engines = require('consolidate');
var buffet = require('buffet');
var poweredBy = require('connect-powered-by');

//var Proto = require('./proto');

module.exports = Website;

/*
 
  The mount point for the HTTP API for the whole stack
 */


function Website(options){
  var self = this;
  options || (options = {});

  this.options = options;
  
  if(!options.hostnames || options.hostnames.length<=0){
    throw new Error('there is a website with no hostnames!');
  }
  
  this.app = express();
  this.app.options = this.options;
}

Website.prototype.__proto__ = EventEmitter.prototype;

Website.prototype.initialize = function(system, loaded_callback){

  var self = this;
  var app = this.app;
  var mounts = [];

  /*
  
    first off lets setup the serving directory and very basic stuff
    we will turn on for all websites (like bodyParser etc)
    
  */
  async.series([
    /*
    
      always apply the basic mixin
      
    */
    function(next){
      /*

        stop the pesky 404's even if they have not specified an icon
        
      */
      app.use(express.favicon(self.options.favicon));
      

      /*
      
        GET
        
      */
      app.use(express.query());
      app.use(express.responseTime());
      app.use(poweredBy('quarry.io test'));

      /*
      
        POST
        
      */
      app.use(express.bodyParser());

      app.engine('ejs', engines.ejs);
      app.set('view engine', 'ejs');
      app.set('views', __dirname + '/views');


      app.configure('development', function(){
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        app.use(function(req, res, next){


        /*
        
          no-caching unless we are live
          
        */
        res.on('header', function(){
          res.setHeader('cache-control', 'no-cache');
          res.setHeader('pragma', 'no-cache');
          res.setHeader('expires', '-1');
        })
        next();
      })
      })

      app.configure('production', function(){
        app.use(express.errorHandler());
      })
      
      /*
      
        Session
        
      */
      
      app.use(self.options.cookieParser);
      app.use(express.session({
        store: self.options.sessionStore,
        secret: self.options.cookieSecret
      }))

      next();
    },

    function(next){

      log.info(dye.cyan('Mounting Middleware'));
      
      async.forEachSeries(self.options.middleware || [], function(service, nextmiddleware){

        var module = service.module;
        var route = service.mount;

        var moduleoptions = _.extend({}, {
          routes:self.options.routes,
          document_root:self.options.document_root,
          script_root:self.options.script_root
        }, service)

        var handler = null;

        if(!module.match(/^quarry\./)){

          var codepath = self.codepath(module);

          var loadedmodule = require(codepath);

          if(!loadedmodule){
            log.info(dye.red('Module not found: middleware -> ' + dye.yellow(codepath)))
            throw new Error('module not found');
          }
          
          handler = loadedmodule(moduleoptions, system);
        }
        /*
        
          no it's a quarry supplier
          
        */
        else{
          module = module.replace(/^quarry\./, '').replace(/\./g, '/');
          var loadedmodule = require('./middleware/' + module);

          if(!loadedmodule){
            log.info(dye.red('Module not found: middleware -> ' + dye.yellow(module)))
            throw new Error('module not found');
          }
          /*
        
            build up the middleware handler
            
          */
          handler = loadedmodule(moduleoptions, system);

        }
        
        if(!handler){
          nextmiddleware();
          return;
        }

        /*
        
          this gives the middleware a chance to configure the server before
          the main routes are used (in the form of app.router)
          
        */
        if(_.isFunction(handler.configure)){
          handler.configure(app);
        }

        /*
        
          the middleware looks after mounting itself
          
        */
        if(_.isFunction(handler.mount)){
          /*
          
            the mounting handler is async
            
          */
          if(handler.mount.length>=2){
            mounts.push(function(next){
              handler.mount(app, next);
            })
          }
          else{
            mounts.push(function(){
              handler.mount(app);
            })
          }

          nextmiddleware();
          
        }
        /*
        
          we look after mounting the middleware based on the options
          
        */
        else if(_.isFunction(handler)){
          var mountmethod = service.method ? service.method : 'use';
          var mountargs = [handler];

          route && (mountargs.unshift(route));

          /*
          
            this does:

              app.use(route, fn)
              app.use(fn)
              app[get|post|put|delete](route, fn)
              app[get|post|put|delete](fn)
            
          */
          mounts.push(function(){
            app[mountmethod].apply(app, mountargs);  
          })

          nextmiddleware();
        }

      }, next)
    
    },

    /*
    
      now we mount the middleware routes
      
    */
    function(next){

      async.forEachSeries(mounts || [], function(fn, nextmiddleware){

        /*
        
          is the middleware running in async mode
          
        */
        if(fn.length>0){
          fn(nextmiddleware);
        }
        else{
          fn();
          nextmiddleware();  
        }
        
      }, next)
    }
  ], loaded_callback)

}

Website.prototype.document_root = function(){
  return this.options.document_root;
}

Website.prototype.hostname = function(){
  return this.options.hostnames[0];
}

Website.prototype.hostnames = function(){
  return this.options.hostnames;
}