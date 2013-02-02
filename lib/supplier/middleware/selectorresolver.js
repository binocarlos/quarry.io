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

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');


/*
  Quarry.io - Selector Resolver
  -----------------------------

  Middleware that can resolve a GET request and chunk down the selector
  to get the final results




 */

module.exports = factory;

function State(arr){
  this.count = arr.length;
  this.index = 0;
  this.finished = false;
}

State.prototype.next = function(){
  this.index++;
  if(this.index>=this.count){
    this.finished = true;
  }
}

function extractskeleton(data){
  return data.meta;
}

function factory(handle){

  if(!handle){
    throw new Error('Select resolver requires a handle method');
  }

  return function(req, res, next){

    var strings = req.getHeader('x-json-selectors');
    var skeleton_array = req.getHeader('x-json-skeleton');
    var stackpath = req.getHeader('x-quarry-route');

    var final_state = new State(strings);
    var final_results = [];

    /*
    
      loop over each of the seperate selector strings

      container("selectorA", "selectorB")

      B -> A
      
    */
    async.forEachSeries(strings.reverse(), function(stage, next_stage){

      final_state.next();

      /*
      
        this is a merge of the phase results

        the last iteration of this becomes the final results
        
      */
      var stage_results = [];

      /*
      
        now we have the phases - these can be done in parallel
        
      */
      async.forEach(stage, function(phase, next_phase){

        var phase_skeleton = [].concat(skeleton_array);

        var selector_state = new State(phase);

        async.forEachSeries(phase, function(selector, next_selector){

          selector_state.next();

          /*
            
            this means we are at the end of the whole reduction!
            
          */
          var laststep = final_state.finished && selector_state.finished;

          /*
          
            this means the selector wants a tree back and we are on the last part of the reduction
            
          */
          var includechildren = laststep && selector.modifier.tree;

          handle({
            selector:selector,
            skeleton:phase_skeleton,
            includedata:laststep,
            includechildren:includechildren
          }, function(error, results){

            if(error || results.length<=0){
              next_phase();
              return;
            }

            /*
            
              if there is still more to get for this string
              then we update the pipe skeleton
              
            */
            if(!selector_state.finished){
              phase_skeleton = _.map(results, extractskeleton);
            }
            /*
            
              this
              
            */
            else{
              stage_results = stage_results.concat(results);
            }

            next_selector();

          })

        }, next_phase)

      }, function(error){

        if(error){
          next_stage(error);
          return;
        }
        /*
        
          this is the result of a stage - we pipe the results to the next stage
          or call them the final results
          
        */

        if(!final_state.finished){
          skeleton_array = _.map(stage_results, extractskeleton);
        }
        else{
          final_results = stage_results;
        }

        next_stage();
      })

    }, function(error){
      if(error){
        res.error(error);
      }
      else{
        final_results = api.filter ? _.filter(final_results, api.filter) : final_results;
        final_results = api.map ? _.map(final_results, api.map) : final_results;

        if(stackpath){
          final_results = _.map(final_results, function(result){
            result.meta || (result.meta = {});
            result.meta.routes || (result.meta.routes = {});
            result.meta.routes.normal || (result.meta.routes.normal = stackpath);
          })
        }
        
        res.json(final_results).send();
      }
    })
    
  }
}