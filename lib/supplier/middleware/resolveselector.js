/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');

var Contract = require('../../contract');
var EventResolver = require('../../warehouse/resolveevents');
var log = require('logule').init(module, 'Selector Resolver');

/*
  Quarry.io - Selector Resolver
  -----------------------------

  Middleware that can resolve a GET request and chunk down the selector
  to get the final results




 */

module.exports = factory;

function State(arr){
  this.arr = [].concat(arr);
  this.count = arr.length;
  this.index = 0;
  this.finished = false;
}

State.prototype.next = function(){
  this.index++;
  this.arr.shift();
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
    var stackpath = req.getHeader('x-quarry-supplier');

    console.log('-------------------------------------------');
    eyes.inspect(req.headers);
    strings = strings.reverse();

    var final_state = new State(strings);
    var final_results = [];
    var select_resolver = EventResolver('select', req, res);

    /*
    
      loop over each of the seperate selector strings

      container("selectorA", "selectorB")

      B -> A
      
    */
    async.forEachSeries(strings, function(stage, next_stage){

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

          var branchselector = [].concat(final_state.arr);
          if(selector_state.arr.length>0){
            branchselector.unshift([[].concat(selector_state.arr)]);
          }

          /*
            
            this means we are at the end of the whole reduction!
            
          */
          selector.modifier.laststep = final_state.finished && selector_state.finished;

          var selectreq = Contract.request({
            method:'get',
            path:'/'
          })

          req.inject(selectreq);
          req.emit('bootstrap', selectreq);

          selectreq.setHeader('x-json-skeleton', phase_skeleton);
          selectreq.setHeader('x-json-selector', selector);

          var selectres = Contract.response(function(){

            if(selectres.hasError() || selectres.body.length<=0){
              next_phase();
              return;
            }

            /*
            
              EVENT RESOLVING
              
            */
            if(_.isArray(selectres.body)){
              _.each(selectres.body, function(data){
                select_resolver({
                  selector:branchselector,
                  meta:data.meta || {}
                })
              })
            }
            

            /*
            
              if there is still more to get for this string
              then we update the pipe skeleton
              
            */
            if(!selector_state.finished){
              phase_skeleton = _.map(selectres.body, extractskeleton);
            }
            /*
            
              this
              
            */
            else{
              stage_results = stage_results.concat(selectres.body);
            }

            next_selector();
          })

          log.info('selector: ' + req.getHeader('x-quarry-fullpath'));
          eyes.inspect(selector);

          handle(selectreq, selectres, function(){
            next_phase();
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
        res.containers(final_results).send();
      }
    })
    
  }
}