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
var _ = require('lodash');
var dye = require('dye');
var log = require('logule').init(module, 'Spark Monitor');

/*

  quarry.io - Spark Monitor

  keeps an eye on the system database so we know when new reception
  servers arrive on the network
  
*/

module.exports = factory;

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

  monitor.start = function(callback){

    /*

    load up the top level worker container

    then grab exiting reception sparks

    then listen for any changes concerning sparks
      

      'group#workers.' + flavour
      
    */
    db(selector).ship(function(group){

      /*
      
        find the initial reception sparks
        
      */
      group('spark').ship(function(sparks){


        sparks.each(function(spark){
          if(ignore_spark && spark.quarryid()==ignore_spark){
            return;
          }
          monitor.emit('add', spark);
        })


        /*
        
          setup a portal for any changes
          
        */
        group.portal()
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

  return monitor;
}