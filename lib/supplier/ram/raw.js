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
var utils = require('../../utils');
var eyes = require('eyes');
var cacheFactory = require('../../container/cache');

/*
  Quarry.io - RAM Supplier
  ------------------------

  Holds containers in memory and performs actions


 */

var api = module.exports = {
  init:function(options){
    this.options = options;
    this.cache = cacheFactory(this.options);
  },
  head:function(req, res, next){
    console.log('raw head');
  },
  get:function(req, res, next){
    //var results = this.cache.select();
    console.log('raw select');
  },
  post:function(req, res, next){
    console.log('raw head');
  },
  put:function(req, res, next){
    console.log('raw head');
  },
  delete:function(req, res, next){
    console.log('raw head');
  }
}