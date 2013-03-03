/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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