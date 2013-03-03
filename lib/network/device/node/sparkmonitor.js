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
var _ = require('lodash');
var dye = require('dye');
var log = require('logule').init(module, 'Spark Monitor');

/*

  quarry.io - Spark Monitor

  keeps an eye on the system database so we know when new reception
  servers arrive on the network
  
*/

module.exports = factory;
module.exports.closure = true;

/*
{
  db:a connection to the system database,
  selector:the selector to listen for sparks beneath,
  ignore_spark:a spark id to ignore

}
*/
function factory(options, callback){

  options || (options = {});

  var db = options.db;

  if(!db){
    throw new Error('There is no db passed to the spark monitor');
  }
  var selector = options.selector;
  var ignore_spark = options.ignore_spark;

  var monitor = {};
  _.extend(monitor, EventEmitter.prototype);

  monitor.start = function(debug, callback){

    if(arguments.length<=1){
      callback = debug;
      debug = null;
    }

    /*

    load up the top level worker container

    then grab exiting reception sparks

    then listen for any changes concerning sparks
      

      'group#workers.' + flavour
      
    */

    db(selector).ship(function(listener){

      /*
      
        find the initial sparks
        
      */
      listener('spark').ship(function(sparks){


        sparks.each(function(spark){
          if(ignore_spark && spark.quarryid()==ignore_spark){
            return;
          }
          monitor.emit('add', spark);
        })


        /*
        
          setup a portal for any changes
          
        */
        listener.portal()
          .appended('spark', function(spark){
            if(ignore_spark && spark.quarryid()==ignore_spark){
              return;
            }
            log.info(dye.red('Spark monitor add'));
            monitor.emit('add', spark);
          })
          .deleted('spark', function(spark){
            if(ignore_spark && spark.quarryid()==ignore_spark){
              return;
            }
            log.info(dye.red('Spark monitor remove'));
            monitor.emit('remove', spark);
          })

        callback();
      })
    })
  }

  callback && callback(null, monitor);

  return monitor;
}