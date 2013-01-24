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

var _ = require('underscore');
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


function Website(options, network_client){
  var self = this;
  options || (options = {});

  this.options = options;
  this.network_client = network_client;

  this.app = express();
  this.app.network_client = network_client;

  this.app.set('options', options);
}

Website.prototype.__proto__ = EventEmitter.prototype;

Website.prototype.initialize = function(loaded_callback){

  var self = this;

  console.log('-------------------------------------------');
  console.log('init');
  /*
  
    first off lets setup the serving directory and very basic stuff
    we will turn on for all websites (like bodyParser etc)
    
  */

  async.series([
    function(next){
      console.log('-------------------------------------------');
      console.log('mounting basic mixin');

       var mixin = require('./mixins/basic');

       mixin(self.app, self.options, next);
    },
    function(next){
      /*
      
        load and apply the mixins
        
      */
      async.forEachSeries(self.options.mixins, function(mixin_config, next_mixin){

        console.log('-------------------------------------------');
        console.log('mounting ' + mixin_config.name + ' mixin');

        var mixin = require('./mixins/' + [mixin_config.name]);

        mixin(self.app, mixin_config.config, next_mixin);

      }, next)
    },

    function(next){
      console.log('-------------------------------------------');
      console.log('setting document root: ' + self.document_root());
      self.app.use(express.static(self.document_root()));
      next();      
    }

  ], loaded_callback)

}

Website.prototype.document_root = function(){
  return [this.options.directory, this.options.document_root].join('/');
}

Website.prototype.hostnames = function(){
  return this.options.hostnames;
}

Website.prototype.express_handler = function(){
  return this.app;
}