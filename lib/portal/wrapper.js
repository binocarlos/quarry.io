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
var Portal = require('./proto');
var EventEmitter = require('events').EventEmitter;

module.exports = {
  portal:portal,
  radio:radio
}

/*

  quarry.io - portal wrapper

  knows how to wrap an array of portals as one


 */
function portal(container){

  var ret = {};

  var portals = container.map(function(c){
    var portal = new Portal();
    portal.attachcontainer(c);
    /*
    
      attach events here
      
    */
    return portal;
  })

  function factory(method){
    return function(){
      var args = _.toArray(arguments);
      _.each(portals, function(portal){
        portal[method].apply(portal, args);
      })
      return this;
    }
  }
  _.each([
    'appended',
    'saved',
    'deleted',
    'sync',
    'raw',
    'broadcastinstruction',
    'radio',
    'close'
  ], function(method){
    ret[method] = factory(method);
  })

  _.extend(ret, EventEmitter.prototype);

  return ret;
}

function radio(container){

  var ret = {};

  var radios = container.map(function(c){
    var portal = new Portal();
    portal.attachcontainer(c);
    return portal.radio();
    /*
    
      attach events here
      
    */
  })

  function factory(method){
    return function(){
      var args = _.toArray(arguments);
      _.each(radios, function(radio){
        radio[method].apply(radio, args);
      })
      return this;
    }
  }
  _.each([
    'listen',
    'talk',
    'close'
  ], function(method){
    ret[method] = factory(method);
  })

  _.extend(ret, EventEmitter.prototype);

  return ret;
}