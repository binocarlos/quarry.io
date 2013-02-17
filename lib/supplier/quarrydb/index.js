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


var utils = require('../../utils')
  , eyes = require('eyes')
  , _ = require('lodash')
  , default_server_options = require('../../network/config.json').servers.mongo
  , mongo = require('../../vendor/mongo');

var ensure_skeleton = require('./ensure_skeleton');

var log = require('logule').init(module, 'QuarryDB Supplier');

/*

  the basic container supplier that maps REST onto our api
  
*/
var ContainerSupplier = require('../container');

/*

  Quarry.io - QuarryDB
  --------------------

  MongoDB based supplier optimized for big trees
  
*/

var handlers = {
  select:require('./select'),
  append:require('./append'),
  save:require('./save'),
  
  delete:require('./delete')
}

module.exports = function(options, system){

  options || (options = {});

  if(!options.collection){
    throw new Error('quarrydb supplier needs a collection option');
  }

  var switchboard = null;
  var supplier = null;
  var supplier_loaded = false;

  function ensuresupplier(callback){
    if(supplier_loaded){
      callback(null, supplier);
      return;
    }

    var server_options = _.defaults(options, default_server_options);

    mongo(server_options, function(error, mongoclient){

      /*
      
        when we are ready preparing we setup the supplier
        hooked into this mongoclient
        
      */
      function client_ready(){

        log.info('mongo server connected:');
        eyes.inspect(server_options);
        
        if(!error){

          /*
          
            construct the basic container supplier

            this setups the request processing middleware
            specifically for container suppliers
            
          */
          supplier = ContainerSupplier(options, system);
 
          /*
          
            provide each of the method handlers

            the container supplier will map these for stamping portals etc
            
          */

          supplier.selectwrapper(handlers.select(mongoclient));
          supplier.appendwrapper(handlers.append(mongoclient));
          supplier.savewrapper(handlers.save(mongoclient));
          supplier.deletewrapper(handlers.delete(mongoclient));

        }

        supplier_loaded = true;
        callback(error, supplier);

      }

      if(server_options.reset){
        mongoclient.drop(client_ready);
      }
      else{
        client_ready();
      }

    })

  }


  /*
  
    the delay tactic so we have time to get setup
    
  */
  return function(req, res, next){
    ensuresupplier(function(error, supplier){
      supplier(req, res, next);
    })
  }
}
