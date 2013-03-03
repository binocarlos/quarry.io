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
var eyes = require('eyes');
var async = require('async');
var _ = require('lodash');

var Node = require('./proto');
var dye = require('dye');
var Device = require('../device');

var Warehouse = require('../../warehouse');
var Supplier = require('../../supplier');

/*

  quarry.io - api node

  virtual host for api servers
  
*/

module.exports = function(trim, node, callback){


      /*
      
        we pass this into the api handlers so they have access to the system tings
        
      */
      var system = {
        id:worker.stackid,
        cache:self.cache,
        worker:worker
      }

      //rpcserver.on('message', supplychain.handle);

      /*
      
        now build up each service
        
      */

      async.forEach(node.find('service').containers(), function(service, nextservice){

        var module = service.attr('module');
        var route = service.attr('mount');

        /*
        
          this will become the Quarry handler
          
        */
        var fn = null;

        var moduleoptions = _.extend({}, service.attr(), {
          stackpath:stackpath
        })

        
        _.each(moduleoptions, function(val, prop){
          if(prop.indexOf('__stack.')==0){
            moduleoptions[prop] = system.worker.stack[prop.substr('__stack.'.length)];
          }
        })


        /*
        
          is it a custom module
          
        */
        if(!module.match(/^quarry\./)){

          var codepath = self.codepath(module);

          var loadedmodule = require(codepath);

          fn = loadedmodule(moduleoptions, system);
        }
        /*
        
          no it's a quarry supplier
          
        */
        else{
          fn = Supplier(module, moduleoptions, system);
        }

        /*
        
          do we have middleware to wrap or are we going in raw?
          
        */

        if(service.attr('middleware') && service.attr('middleware').length>0){
          var apifn = fn;

          fn = Warehouse();

          _.each(service.attr('middleware'), function(middlewareoptions){
            if(!middlewareoptions.module.match(/^quarry\./)){
              var codepath = self.codepath(middlewareoptions.module);

              var loadedmiddlewaremodule = require(codepath);

              var middlewarefn = loadedmodule(middlewareoptions, system);

              fn.use(middlewarefn);
            }
            else{
              var middlewarefn = Supplier.middleware[middlewareoptions.module.replace(/^quarry\./, '')](middlewareoptions, system);

              fn.use(middlewarefn);
            }
          })

          fn.use(apifn);
        }

        var wrapper = supplychain.wrapper(route, fn);

        /*
        
          mount the quarryfn on the supply chain
          
        */
        route=='/' ? supplychain.use(wrapper) : supplychain.use(route, wrapper);

        nextservice();

      }, next)
      
    }

  ], function(){

    callback();
  })
  
}