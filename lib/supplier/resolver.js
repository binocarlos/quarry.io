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

var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var eyes = require('eyes');
var Backbone = require('../vendor/backbone');
var selectorFactory = require('../query/selector');
var Request = require('../query/request');
var Response = require('../query/response');

/*
  Quarry.io - Resolver
  --------------------

  Handles a single supplier selector query

  It knows how to pipe and merge the whole selector contract


 */

exports = module.exports = factory;

function pipe(options, callback){
  options || (options = {});

  var list = options.list;
  var run = options.run;
  var input = options.input;

  var active = true;
  var counter = 0;

  async.whilst(function(){
    return list.length>0 && active;
  }, function(next){
    var item = list.shift();

    run(item, input, counter, function(error, results){
      if(error){
        callback(error);
        return;
      }
      else if(results && results.length==0){
        callback(null, []);
        return;
      }
      input = results;
      counter++;
      next();
    })
    
  }, function(error){
    callback(error, input);
  })
}

function merge(options, callback){
  options || (options = {});

  var list = options.list;
  var run = options.run;
  var input = options.input;
  var counter = 0;

  var allresults = [];

  async.forEach(list, function(item, next_item){
    run(item, input, counter, function(error, results){
      allresults = allresults.concat(results);
      counter++;
      next_item();
    })
  }, function(error){
    callback(error, allresults);
  })
}

function factory(options, main_callback){
  options || (options = {})
  var supplychain = options.supplychain;
  var mainreq = options.req;
  var mainres = options.res;

  var skeleton = mainreq.skeleton();
  var selectors = mainreq.selectors();

  var contract_length = selectors.length;

  // the strings: "folder > city", "context"
  pipe({
    list:selectors,
    input:skeleton,
    run:function(phases, input, string_counter, pipe_callback){
      // the phases: folder, otherthing
      merge({
        list:phases,
        input:input,
        run:function(phase, input, phase_counter, merge_callback){

          var phase_length = phase.length;
          // the stages: a > b
          pipe({
            list:phase,
            input:input,
            run:function(selector, input, stage_counter, select_callback){

              // this means we are returning the final stage of results and should include our route
              var includedata = string_counter >= contract_length-1 && stage_counter >= phase_length-1;

              // this means the selector states we want a tree in the results
              var includechildren = selector.modifier && selector.modifier.tree;

              // here is where we branch based on the provided skeleton
              var normal_skeleton = [];
              var branch_skeleton = [];

              _.each(input, function(check_skeleton){
                /*
                if(skeleton.meta && skeleton.meta.pointer){
                  branch_skeleton.push(check_skeleton);
                }
                else{
                  normal_skeleton.push(check_skeleton);
                }
                */
                normal_skeleton.push(check_skeleton);
              })

              _.each(branch_skeleton, function(branch){
                // do the branch here
              })

              /*

                This request we fire into our supply chain as normal runnings

               */
              var req = new Request({
                method:'get',
                path:'/'
              })

              mainreq.copyinto(req);
              req.skeleton(normal_skeleton);
              req.selector(selector);
              req.param('includedata', includedata);
              req.param('includechildren', includedata && includechildren);

              var res = new Response();

              /*

                Results callback

               */

              res.on('send', function(){

                // if we have an error then add it to the main request
                if(res.hasError()){
                  mainres.addMultipart(res);
                  select_callback && select_callback();
                }
                // check if we are on the last stage - in which case
                // lets include the results in the main request
                else if(includedata){
                  mainres.addMultipart(res);
                  select_callback && select_callback();
                }
                // otherwise pipe the data through the resolver
                else{
                  select_callback && select_callback(null, res.body());
                }
              })

              /*

                Run request

               */
              supplychain(req, res, function(){
                select_callback && select_callback(null, []);
              })
            }
          }, merge_callback);
        }
      }, pipe_callback);
    }
  }, function(error, results){

    if(error){
      mainres.sendError(error);
    }
    else{
      mainres.send();
    }
  })

  
}