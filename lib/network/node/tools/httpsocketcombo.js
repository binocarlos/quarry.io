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
var log = require('logule').init(module, 'Socket Combo');
var dye = require('dye');
/*

  quarry.io - HTTP Socket Combo

  transparent proxy to a bunch of http endpoints registered by hostname
  
*/

module.exports = factory;

function factory(options){

  options = _.defaults(options || {}, {
    
  })

  var endpoints = {};

  var combo = {

    /*
    
      the sockets by their id
      
    */


    add:function(hostname, endpoint){
      endpoints[hostname] = endpoint;

      log.info(dye.yellow('Add Endpoint: ' + hostname + ' --- ' + endpoint))

    },

    remove:function(hostname){
      delete(endpoints[id]);
    },

    /*
    
      we pick the socket we want to send down
      
    */
    proxy:function(req, res){
      
    }

    
  }

  _.extend(combo, EventEmitter.prototype);

  return combo;
}