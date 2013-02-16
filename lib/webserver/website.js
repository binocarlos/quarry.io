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
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
//var Proto = require('./proto');

module.exports = Website;

/*
 
  The mount point for the HTTP API for the whole stack
 */


function Website(options){
  var self = this;
  options || (options = {});

  this.options = options;
  this.options.hostnames || (this.options.hostnames = [utils.littleid()]);
  this.app = express();
  this.app.set('options', this.options);
}

Website.prototype.__proto__ = EventEmitter.prototype;

Website.prototype.initialize = function(supplychain, loaded_callback){

  this.supplychain = supplychain;

  var self = this;
  var app = this.app;

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

      
      
      /*
      
        POST
        
      */
      app.use(express.bodyParser());

      app.use(function(req, res, next){
        res.send('hello world!!!');
      })

      console.log('-------------------------------------------');
      console.log('setting document root: ' + self.document_root());
      self.app.use(express.static(self.document_root()));
      next();
    }


  ], function(){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('basic website loaded - time for middleware');
    
    loaded_callback();
  })

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