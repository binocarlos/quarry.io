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
//var Proto = require('./proto');

module.exports = Website;

function Website(options){
  var self = this;
  options || (options = {});

  this.options = options;

  this.app = express();

  this.app.use(function(req, res, next){
    res0.send('hello world from website');
  })
}

Website.prototype.__proto__ = EventEmitter.prototype;

Website.prototype.initialize = function(loaded_callback){
  loaded_callback();
}

Website.prototype.hostnames = function(){
  return this.options.hostnames;
}

Website.prototype.express_handler = function(){
  return this.app;
}