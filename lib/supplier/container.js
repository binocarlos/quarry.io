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

var Contract = require('../contract');
var Container = require('../container');
var Portal = require('../container/portal');
var Warehouse = require('../warehouse');

var stampcontainers = require('./middleware/stampcontainers');
var resolvecontract = require('./middleware/resolvecontract');
var resolveselector = require('./middleware/resolveselector');
var extractselector = require('./middleware/extractselector');
var extractskeleton = require('./middleware/extractskeleton');
var broadcastportals = require('./middleware/broadcastportals');

var log = require('logule').init(module, 'Container Supplier');

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

function addportal(req, instruction){
  var instructions = req.getHeader('x-json-portal-instructions') || [];
  instructions.push(instruction);
  req.setHeader('x-json-portal-instructions', instructions);
}

module.exports = function(options){

  options || (options = {});

  var app = Warehouse();

  /*
  
    a self-referential contract resolver
    so we can speak directly to containers
    
  */

  app.use(resolvecontract(app));

  /*
  
    we always want the skeleton extracted
    
  */
  app.use(extractskeleton());

  /*
  
    setup the data stamper with the portal router of the actual supplier
    (this extracts a materialized path from container meta data so we
    can get a global tree based subscription routing key)
    
  */
  app.use(stampcontainers());

  /*
  
    hook up the server-side portals for POST/PUT & DELETE
    
  */
  app.use(broadcastportals());

  /*
  
    GET
    
  */

  /*
  
    hook up the extracter for the selectors
    
  */
  app.get(extractselector());  

  app.selectwrapper = function(handle){
    log.info('adding SELECT container supplier API');

    var resolver = resolveselector(handle);

    app.get(function(req, res, next){

      log.info('GET req: ' + req.summary());

      resolver(req, res, next);
    })
  }

  /*
  
    POST
    
  */
  app.appendwrapper = function(handle){
    log.info('adding APPEND container supplier API');

    app.post(function(req, res, next){

      if(req.getHeader('x-quarry-debug')){
        console.log(JSON.stringify(req.toJSON(), null, 4));
        process.exit();  
      }
      
      log.info('POST req: ' + req.summary());

      addportal(req, {
        action:'append',
        target:req.getHeader('x-json-skeleton')[0],
        data:'__req.body'
      })

      handle(req, res, next);
    })
  }


  /*
  
    PUT
    
  */

  app.savewrapper = function(handle){
    log.info('adding SAVE container supplier API');

    app.put(function(req, res, next){
      
      log.info('PUT req: ' + req.summary());

      addportal(req, {
        action:'save',
        target:req.getHeader('x-json-skeleton')[0],
        data:req.body
      })

      handle(req, res, next);
    })
  }

  /*
  
    DELETE
    
  */

  app.deletewrapper = function(handle){
    log.info('adding DELETE container supplier API');

    app.delete(function(req, res, next){
      
      log.info('DELETE req: ' + req.summary());

      addportal(req, {
        action:'delete',
        target:req.getHeader('x-json-skeleton')[0],
        data:req.body
      })

      handle(req, res, next);
    })
  }
  
  return app;

}