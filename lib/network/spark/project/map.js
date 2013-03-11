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


var utils = require('../../../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Departments = require('../../../department');
var Warehouse = require('../../../warehouse');
var Container = require('../../../container');

/*

  Quarry.io - Map
  ---------------

  Keeps track of the sparks across the quarry

  this is used by sparks to keep multiple connections to core services
  (like reception, switchbaord and web)
  
*/

module.exports = function(options){

  if(!options){
    throw new Error('Map requires some options');
  }

  if(!options.database){
    throw new Error('Map requires a database');
  }

  var database = options.database;
  var stack = options.stack;
  
  var quarrymap = _.extend({
    
    prepare:function(done){

      var self = this;
      var container = Container.new('map').addClass('stack');

      /*
      
        upload the stack onto the database

        we will use this to manage jobs and workers
        
      */
      database
        .append(container)
        .title('Appending map to deployment database')
        .ship(function(){

          var routingradio = container.radio();

          routingradio.listen('route', function(routingmessage){
            
            /*
            
              here we have a central sense of ALL map messages

              we can build a network map from this
              
            */

            eyes.inspect('MAP: ' + routingmessage.department + ' @ ' + routingmessage.timestamp);
          })

          self.container = container;
          done();

        })
      
      return this;
    }

  }, options)

  _.extend(quarrymap, EventEmitter.prototype);

  return quarrymap;
}