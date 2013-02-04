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

var contractresolver = require('./middleware/contractresolver');
var selectorresolver = require('./middleware/selectorresolver');
var selectorextractor = require('./middleware/selectorextractor');
var skeletonextractor = require('./middleware/skeletonextractor');

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

module.exports = function(){

  var app = Warehouse();

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


  app.selectwrapper = function(handle){
    log.info('adding SELECT container supplier API');

    var resolver = selectorresolver(handle);

    app.get(function(req, res, next){

      log.info('GET req: ' + req.summary());

      res.on('beforesend', function(){

        if(res.isContainers()){
          req.emit('stamp', res.body);
        }

      })

      resolver(req, res, next);
    })
  }

  app.appendwrapper = function(handle){
    log.info('adding APPEND container supplier API');

    app.post(function(req, res, next){
      
      log.info('POST req: ' + req.summary());

      res.on('beforesend', function(){

        if(res.isContainers()){
          req.emit('stamp', res.body);
        }
        
        if(res.body.length>0){

          res.setHeader('x-json-portal', {
            routingkey:'append',
            requestheaders:req.headers
          })

          req.emit('portal', res);
        }

      })

      handle(req, res, next);
    })
  }


  app.savewrapper = function(handle){
    log.info('adding SAVE container supplier API');

    app.put(function(req, res, next){
      
      log.info('PUT req: ' + req.summary());

      res.on('beforesend', function(){

        if(res.isContainers()){
          req.emit('stamp', res.body);
        }
        
        res.setHeader('x-json-portal', {
          routingkey:'save',
          requestheaders:req.headers
        })

        req.emit('portal', res);

      })

      handle(req, res, next);
    })
  }

  app.deletewrapper = function(handle){
    log.info('adding DELETE container supplier API');

    app.delete(function(req, res, next){
      
      log.info('DELETE req: ' + req.summary());

      res.on('beforesend', function(){

        res.setHeader('x-json-portal', {
          routingkey:'delete',
          requestheaders:req.headers
        })

        req.emit('portal', res);


      })

      handle(req, res, next);
    })
  }
  
  return app;

}


/*

  app.post(function(req, res, next){

    log.info('running POST');

    var resproxy = Contract.response(function(){

    })
    res.on('beforesend', function(){

    })

    api.append(req, res, next);


      req:req,
      skeleton:skeleton,
      body:req.body
    }, function(error, results){

      if(error){
        res.error(error);
        return;
      }

      req.emit('stamp', results);


      res.containers(results);

      if(results.length>0){

        res.setHeader('x-json-portal', {
          routingkey:'append',
          skeleton:skeleton
        })

        req.emit('portal', res);
      }

      res.send();
    })
  })

  app.put(function(req, res, next){

    var skeleton = req.getHeader('x-json-skeleton') || [];

    api.save({
      skeleton:skeleton,
      body:req.body
    }, function(error, results){

      console.log('-------------------------------------------');
      console.log('after save');
      eyes.inspect(results);
      process.exit();

      if(error){
        res.error(error);
        return;
      }

      req.emit('stamp', results);


      res.json(results);

      if(results.length>0){


        res.setHeader('x-json-portal', {
          routingkey:'save',
          skeleton:skeleton
        })

        req.emit('portal', res);
      }


      res.send();
    })
  })


  app.delete(function(req, res, next){

    var skeleton = req.getHeader('x-json-skeleton') || [];

    api.delete({
      skeleton:skeleton
    }, function(error, results){

      console.log('-------------------------------------------');
      console.log('after delete');
      eyes.inspect(results);
      process.exit();
      if(error){
        res.error(error);
        return;
      }

      req.emit('stamp', results);

      res.json(results);

      if(results.length>0){



        res.setHeader('x-json-portal', {
          routingkey:'save',
          skeleton:skeleton
        })

        req.emit('portal', res);
      }


      res.send();
    })
  })
  
  return app;
}
*/