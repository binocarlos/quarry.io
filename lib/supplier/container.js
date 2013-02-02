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


var utils = require('../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var Warehouse = require('../warehouse');
var contractresolver = require('./middleware/contractresolver');
var selectorresolver = require('./middleware/selectorresolver');
var selectorextractor = require('./middleware/selectorextractor');
var skeletonextractor = require('./middleware/skeletonextractor');

/*

  Quarry.io - Container Supplier
  ------------------------------

  mounts the warehouse routes to deal with REST requests

  The following functions can be defined with the api that you provide:

    meta - just return the meta data for container(s)

      - quarryid (the singlecontext)
      OR
      - skeleton (the skeleton context)
      
    select - a single selector for either an id or skeleton array

      - selector (single stage selector object)

      - quarryid (the singlecontext)
      OR
      - skeleton (the skeleton context)

      - include_children (whether to do a 2nd hit for children)
      - include_attr (whether to return full data or just a skeleton)

    append - add a container

      - parentid
      - data

    save - save a container

      - quarryid
      - data

    delete - delete a container

      - quarryid
  
*/

function blankhandler(req, res, next){
  next();
}

function portal(req){
  return function(skeleton, routingkey, message){
    req.emit('portal', skeleton, routingkey, message);
  }
}

module.exports = function(api){

  var app = Warehouse();

  /*
  
    setup the defaults as next handlers
    
  */
  _.defaults(api, {
    select:blankhandler,
    append:blankhandler,
    save:blankhandler,
    delete:blankhandler
  })

  /*
  
    a self-referential contract resolver
    so we can speak directly to containers
    
  */
  app.use(contractresolver(app));

  /*
  
    we always want the skeleton extracted
    
  */
  app.use(skeletonextractor());

  /*
  
    SELECT
    
  */
  app.get(selectorextractor());
  app.get(selectorresolver(api.select));


  /*
  
    APPEND
    
  */
  app.post(function(req, res, next){

    api.append({
      portal:portal(req),
      skeleton:req.getHeader('x-json-skeleton') || [],
      body:req.body
    }, function(error, results){
      res.json(results);
    })
  })

  /*
  
    SAVE
    
  */
  app.put(function(req, res, next){
    api.save({
      skeleton:req.getHeader('x-json-skeleton') || [],
      body:req.body
    }, function(error, results){
      res.json(results);
    })
  })

  /*
  
    APPEND
    
  */
  app.delete(function(req, res, next){
    api.delete({
      skeleton:req.getHeader('x-json-skeleton') || []
    }, function(error, results){
      res.json(results);
    })
  })
  
  return app;
}
