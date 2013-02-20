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

/*
  Quarry.io - Find
  ----------------

  A sync version of the selector resolver for use with already loaded containers

  This is used for container.find() to return the results right away jQuery style




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

/*

  search is the function that accepts a single container and the single selector to resolve
  
*/
function factory(searchfn){

  /*
  
    context is the container to search from

    selectors is the top level array container indivudally processed selector strings
    
  */

  return function(selectors, context){

    var final_state = new State(selectors);
    var final_results = context.spawn();

    /*
    
      loop over each of the seperate selector strings

      container("selectorA", "selectorB")

      B -> A
      
    */
    _.each(selectors.reverse(), function(stage){

      final_state.next();

      /*
      
        this is a merge of the phase results

        the last iteration of this becomes the final results
        
      */
      var stage_results = context.spawn();

      /*
      
        now we have the phases - these can be done in parallel
        
      */
      _.each(stage, function(phase){

        var phase_context = context;

        var selector_state = new State(phase);

        _.each(phase, function(selector){

          selector_state.next();

          var results = searchfn(selector, phase_context);

          /*
          
            quit the stage loop with no results
            
          */
          if(results.count()<=0){
            return false;
          }

          /*
          
            if there is still more to get for this string
            then we update the pipe skeleton
            
          */
          if(!selector_state.finished){
            phase_context = results;
          }
          /*
          
            this
            
          */
          else{
            stage_results.add(results);
          }

          return true;

        })

      

      })

      /*
      
        quit the stages with no results
        
      */
      if(stage_results.count()<=0){
        return false;
      }


      /*
      
        this is the result of a stage - we pipe the results to the next stage
        or call them the final results
        
      */

      if(!final_state.finished){
        context = stage_results;
      }
      else{
        final_results = stage_results;
      }
    })

    return final_results;

  }
}