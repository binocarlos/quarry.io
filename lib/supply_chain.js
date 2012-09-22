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

  use things offered up to a supply chain function


 */

var api = {};

module.exports = api;

api.reduce_select = function(select_function, router_function){

  var router = router_function ? router_function : reducer;

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
      router({
        message:{
          selector:context,
          skeleton:true,
          previous:previous
        }
      }, function(error, first_packet){
        router({
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
          router({
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
          select_function({
            message:{
              selector:stage,
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