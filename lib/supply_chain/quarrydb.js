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

var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    containerFactory = require('../container'),
    mongo = require('../clients/mongo'),
    async = require('async'),
    eyes = require('eyes'),
    select_stage_helper = require('./quarrydb/select_stage'),
    append_helper = require('./quarrydb/append');
    
/*
  Quarry.io Quarrydb supply chain
  -------------------------------

  Points into a mongodb collection and uses the rationalnestedset encoder

  options
  -------

  {
    
  }

 */



function factory(options){

  options = _.defaults(options, {
    collection:'bob'
  })

  // is the database ready
  var ready = false;
  var user_ready_functions = ready_callback ? [ready_callback] : [];

  var actions = {};

  var mongo_client = null;

  var quarrydb = function(packet, callback){

    // if we have a function for 'action' - run it
    if(actions[packet.action]){
      actions[packet.action].apply(this, [packet, callback]);
    }
    else{
      packet.answer = {
        ok:false,
        error:packet.action + ' action not found'
      }

      callback(packet.answer.error, packet);
    }

  }

  // we use the router to pass messages on internally or out onto the network
  var router = options.router || quarrydb;

  quarrydb.options = options;

  // preapre the mongo connection for our collection
  mongo(options, function(error, client){
    mongo_client = client;
    trigger_ready();
  })

  /*
    run a single selector stage over the RAM data
   */
  actions.select = function(packet, callback){

    var message = packet.message;
    var selector = message.selector || [];

    // the list of previous ids
    var previous = message.previous;

    // we have multiple phases - pipe them in parallel
    if(selector.length>1){

      var all_results = [];

      async.forEach(selector, function(phase, phase_callback){

        // trigger the phase through the router - it might even end up above!
        router({
          action:'select',
          message:{
            selector:[phase],
            previous:previous
          }
        }, function(error, res){
          all_results = all_results.concat(res.answer.results);
          phase_callback();
        })

      }, function(error){

        // all phases are run - we have merged results - return them!
        packet.answer = {
          ok:true,
          results:all_results
        }

        callback(error, packet);
      })
    }
    // this is where we actuall do some work
    else{

      // here we have a single phase
      var phase = selector[0];

      // skeleton or full mode switch
      var stage_counter = 0;

      // as soon as no results for a stage we bail out
      var bailed_out = false;

      // loop the phases of the selector - replace the previous list each time
      async.forEachSeries(phase, function(stage, stage_callback){

        // no more to do because there were no results the last time
        if(bailed_out){
          stage_callback();
          return;
        }

        // so lets run the stage via the router
        router({
          action:'select_stage',
          message:{
            selector:stage,
            skeleton:stage_counter<phase.length-1,
            previous:previous
          }
        }, function(error, packet){
          
          previous = packet.answer.results;

          // if we have no results then bail out of the other stages
          if(previous.length<=0){
            bailed_out = true;
          }

          stage_callback(error)
        })

        stage_counter++;
      }, function(error){

        packet.answer = {
          ok:true,
          results:previous
        }
        // we have full data here
        callback(error, packet);
      })

    }
  }

  /*
    select a single selector stage

   */
  actions.select_stage = function(packet, callback){

    select_stage_helper(mongo_client, packet, callback);
    
  }

  /*
    append one container to another
   */
  actions.append = function(packet, callback){

    append_helper(mongo_client, packet, callback);
  }

  return quarrydb;
}

// expose createModule() as the module
exports = module.exports = factory;

