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
var url = require('url');
var uuid = require('node-uuid');

var utils = module.exports = {};

/**
 * generate a new global id
 */

utils.quarryid = function(){
  return uuid.v1();
}

/**
 * takes a string and prepares it to be used in a RegExp itself
 */

utils.escapeRegexp = function(search){
  return search.replace(/([\!\$\(\)\*\+\.\/\:\=\?\[\\\]\^\{\|\}])/g, "\\$1");
}

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

utils.escape = function(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api private
 */

utils.parseUrl = function(req){
  var parsed = req._parsedUrl;
  if (parsed && parsed.href == req.url) {
    return parsed;
  } else {
    return req._parsedUrl = url.parse(req.url);
  }
};

/*

  make a route - optionally replace the '/'s with delimeter
  
*/
utils.makeroute = function(parts, delimeter){
  var route = _.filter(parts || [], function(part){
    return part!=null;
  }).join('/');

  if(delimeter){
    route = route.replace(/\//g, delimeter);
    if(route.indexOf(delimeter)==0){
      route = route.substr(1);
    }
  }

  return route;
}