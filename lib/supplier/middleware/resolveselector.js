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
  Quarry.io - Resolve Selector
  ----------------------------

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

function factory(selectfn){

  return function(req, res, next){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('have request');
    
    var strings = req.getHeader('x-json-selectors');
    var skeleton = req.getHeader('x-json-skeleton');

    eyes.inspect(strings);
    console.log('-------------------------------------------');
    eyes.inspect(skeleton);

    var string_state = new State(strings);

    /*
    
      loop over each of the seperate selector strings

      container("selectorA", "selectorB")

      B -> A
      
    */
    async.forEachSeries(strings.reverse(), function(phases, next_string){

      string_state.next();

      var phase_state = new State(phases);

      /*
      
        now we have the phases - these can be done in parallel
        
      */
      async.forEach(phases, function(phase, next_phase){

        phase_state.next();

        var phase_skeleton = [].concat(skeleton);
        var phase_results = [];

        var selector_state = new State(phase);

        async.forEachSeries(phase, function(selector, next_selector){

          selector_state.next();

          selectfn({
            selector:selector,
            skeleton:phase_skeleton
          }, function(error, results){

            if(error || results.length<=0){
              next_phase();
              return;
            }

            /*
            
              this means we are at the end of the reduction!
              
            */
            if(selector_state.finished && phase_state.finished && string_state.finished){

            }

            next_selector();

          })

        }, next_phase)

      }, next_string)

    }, function(error){
      
    })
    
  }
}