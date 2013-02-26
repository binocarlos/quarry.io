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
var bootstrap = require('../bootstrap');
var buffet = require('buffet');

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

  return {
    mount:function(app){

      app.use(mount, buffet({
        root:__dirname + '/www',
        poweredBy:'quarry.io',
        watch:true,
        maxAge:0
      }))
      
    }
  }

}