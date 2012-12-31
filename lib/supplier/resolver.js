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
var router = require('../query/router');

/*
  Quarry.io - Resolver
  --------------------

  Handles a single supplier selector query

  It knows how to pipe and merge the whole selector contract


 */

exports = module.exports = factory;

function pipe(options, callback){
  options || (options = {});

  var list = ([]).concat(options.list || []);
  var run = options.run;
  var input = options.input || [];

  var active = true;
  var counter = 0;

  async.whilst(function(){
    return list.length>0 && active;
  }, function(next){
    var item = list.shift();

    run({
      item:item,
      remaining:list,
      input:input,
      counter:counter
    }, function(error, results){
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

  var list = ([]).concat(options.list || []);
  var run = options.run;
  var input = options.input || [];
  var counter = 0;

  var allresults = [];

  async.forEach(list, function(item, next_item){
    run({
      item:item,
      input:input,
      counter:counter
    }, function(error, results){
      allresults = allresults.concat(results);
      counter++;
      next_item();
    })
  }, function(error){
    callback(error, allresults);
  })
}

function factory(options){
  options || (options = {})
  var supplychain = options.supplychain;
  var mainreq = options.req;
  var mainres = options.res;

  var skeleton = mainreq.skeleton();
  var selectors = mainreq.selectors();

  var router_mode = mainreq.routermode() || 'post';

  // the strings: "folder > city", "context"
  pipe({
    list:selectors,
    input:skeleton,
    run:function(stringstate, pipe_callback){
      
      // the phases: folder, otherthing
      merge({
        list:stringstate.item,
        input:stringstate.input,
        run:function(phasestate, merge_callback){

          // the stages: a > b
          pipe({
            list:phasestate.item,
            input:phasestate.input,
            run:function(stagestate, select_callback){

              /*
              
                Knows how to extract the current status of selector
                array from the reduction loop
                
              */
              function get_branch_selectors(){

                var branch_selectors = ([]).concat(stagestate.remaining)
                branch_selectors.unshift(stagestate.item);
                var branch_phase = [branch_selectors];
                var branch_strings = ([]).concat(stringstate.remaining)
                branch_strings.unshift(branch_phase);

                return branch_strings;

              }

              var selector = stagestate.item;
              
              // this means we are returning the final stage of results and should include our route
              var includedata = stringstate.counter >= selectors.length-1 && stagestate.counter >= phasestate.item.length-1;

              // this means the selector states we want a tree in the results
              var includechildren = selector.modifier && selector.modifier.tree;

              /*

                This request we fire into our supply chain as normal runnings

               */
              var req = new Request({
                method:'get',
                path:'/'
              })

              mainreq.copyinto(req);
              
              req.param('includedata', includedata);
              req.param('includechildren', includedata && includechildren);

              // here is where we branch based on the provided skeleton
              var normal_skeleton = [];

              _.each(stagestate.input, function(check_skeleton){
                var branch_route = router.branch(check_skeleton, router_mode);

                /*
  
                  The container has branched - tell the reception holdingbay

                 */
                if(stagestate.counter>0 && branch_route){
                  
                  
                  var skeleton = router.skeleton(check_skeleton, router_mode);
                  var branchreq = req.clone();

                  branchreq.skeleton([skeleton]);
                  branchreq.selectors(get_branch_selectors());
                  branchreq.resetroute(':reception', skeleton.route);

                  mainreq.branch(branchreq);
                }
                else{
                  normal_skeleton.push(check_skeleton);  
                }
              })

              req.selector(selector);
              req.skeleton(normal_skeleton);

              var res = new Response();

              /*

                Results callback

               */

              res.on('send', function(){

                // if we have an error then add it to the main request
                if(res.hasError()){
                  mainres.addMultipart(res);
                  pipe_callback && pipe_callback();
                  return;
                }
                // check if we are on the last stage - in which case
                // lets include the results in the main request
                
                if(includedata){
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
  }, function(error){

    if(error){
      mainres.sendError(error);
    }
    else{
      mainres.send();
    }
  })

  
}