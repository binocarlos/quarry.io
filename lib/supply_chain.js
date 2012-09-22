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
    containerFactory = require('./container'),
    eyes = require('eyes'),
    async = require('async');
    
/*
  Quarry.io Supply Chain
  ----------------------

  reduce a selector by splitting it into the various parts

  the endpoint is a supply_chain that can run a 'selector' stage

  the router is either a function to which every stage is piped or an
  object to which the named stages are piped

  the router lets you force results to be sent back over the wire
  before continuing

  if the router does not match - the request is simply reduced in process
  and ends-up at the end-point

  this gives you total control over how and when the results leave the endpoint
  process to be filtered

 */

var api = {};

module.exports = api;

api.reduce_select = function(endpoint, router){

  // the default routes is all in memory until the endpoint
  var routes = {
    context:reducer,
    selector:reducer,
    phase:reducer,
    stage:endpoint
  };

  if(_.isFunction(router)){
    routes.context = router;
    routes.selector = router;
    routes.phase = router;
  }
  else if(_.isObject(router)){
    _.each(router, function(val, key){
      routes[key] = val;
    })
  }

  // make us a function that the results of the given step will
  // be sent to
  function packet_router(step, packet, callback){

    packet.action = 'select';

    routes[step] ? routes[step](packet, callback) : null;

  }
  

  // the main recursion loop to reduce a selector
  function reducer(packet, main_callback){

    var message = packet.message;
      
    var selector = message.selector;
    var context = message.context;
    var skeleton = message.skeleton;

    // here we do not want 'root' containers to be involved in the selection
    var previous = _.filter(_.map(message.previous, function(prev){
      return _.isObject(prev) ? prev._meta.quarryid : prev;
    }), function(val){
      return val!=='root';
    })

    if(context){
      packet_router('context', {
        message:{
          selector:context,
          skeleton:true,
          previous:previous
        }
      }, function(error, first_packet){
        packet_router('selector', {
          message:{
            selector:selector,
            previous:first_packet.answer.results
          }
        }, function(error, final_packet){
          packet.answer = final_packet.answer;
          main_callback(error, packet);
        });
      })
    }
    else{
      // we have multiple phases - pipe them in parallel
      if(selector.length>1){

        var all_results = [];

        async.forEach(selector, function(phase, phase_callback){

          // trigger the phase through the router - it might even end up above!
          packet_router('phase', {
            message:{
              selector:[phase],
              skeleton:true,
              previous:previous
            }
          }, function(error, phase_packet){
            all_results = all_results.concat(phase_packet.answer.results);
            phase_callback();
          })

        }, function(error){

          // all phases are run - we have merged results - return them!
          packet.answer = {
            ok:true,
            results:all_results
          }

          main_callback(error, packet);
        })
      }
      // this is where we actuall do some work
      else{

        // here we have a single phase because it has been reduced for us
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
          packet_router('stage', {
            message:{
              selector:[[stage]],
              skeleton:stage_counter < phase.length-1 || skeleton,
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
          main_callback(error, packet);
        })
      }
    }
  }

  return reducer;
}