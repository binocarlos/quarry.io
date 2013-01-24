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
var utils = require('../../../utils');
var eyes = require('eyes');
var express = require('express');
var passport = require('passport');
var fs = require('fs');
var providers = {};

_.each(fs.readdirSync(__dirname + '/providers'), function(filename){
  var provider_name = filename.replace(/\.js$/, '');

  providers[provider_name] = require('./providers/' + provider_name);
})

/*

  HTTP AUTH mixin
  
*/
module.exports = function(app, options, callback){
  
  var route = options.route;
  var network_client = app.network_client;

  console.log('-------------------------------------------');
  console.log('mounting auth');

  _.each(options.providers, function(config, name){
    console.log('-------------------------------------------');
    console.log('mounting: ' + name);

    providers[name].apply(null, [app, network_client, options, config]);

  })
  
  callback();
}