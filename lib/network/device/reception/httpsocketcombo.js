/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('../../../utils');
var eyes = require('eyes');
var _ = require('lodash');
var deck = require('deck');
var dye = require('dye');
var request = require('request');

/*

  quarry.io - HTTP Socket Combo

  transparent proxy to a bunch of http endpoints registered by hostname
  
*/

module.exports = factory;
module.exports.closure = true;
module.exports.async = false;

function factory(options){

  options = _.defaults(options || {}, {
    
  })

  var endpoints = {};
  var endpointarray = [];

  var combo = {

    /*
    
      the sockets by their id
      
    */


    add:function(id, endpoint){
      endpoints[id] = endpoint;
      endpointarray = _.values(endpoints);
    },

    remove:function(id){
      delete(endpoints[id]);
      endpointarray = _.values(endpoints);
    },

    /*
    
      we pick the socket we want to send down
      
    */
    proxy:function(path, req, res){

      var endpoint = deck.pick(endpointarray);
      var url = [req.protocol, '://', endpoint.hostname, ':', endpoint.port, path].join('');
      var options = {
        uri:url,
        qs:req.query,
        method:req.method,
        headers:req.headers
      }

      if(req.method.toLowerCase()!='get'){
        options.body = req.body;
      }

      request(options).pipe(res);
        
    }

    
  }

  _.extend(combo, EventEmitter.prototype);

  return combo;
}