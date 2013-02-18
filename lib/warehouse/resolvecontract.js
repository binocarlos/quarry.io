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
var dye = require('dye');

var log = require('logule').init(module, 'Contract Resolver');

var contractfactory = require('../contract');

/*
  Quarry.io - Contract Resolver
  -----------------------------

  Middleware that knows how to merge and pipe

  You provide it with a handler function to issue
  indivudal requests to




 */

module.exports = factory;

function factory(supplychain){

  if(!supplychain){
    throw new Error('Select resolver requires a supplychain client');
  }

  var resolvers = {

    /*
    
      run each contract request in parallel and merge the results
      into a single response
      
    */
    merge: function(contract, mainres){

      var merge = [];

      var counter = 0;

      async.forEach(contract.body, function(reqdata, next){

        var req = contractfactory.request(reqdata);
        contract.inject(req);
        contract.emit('bootstrap', req);

        req.setHeader('x-contract-index', counter++);

        var res = contractfactory.response(function(){
          mainres.add(res);
          next();
        })

        supplychain(req, res, next);

      }, function(){

        mainres.send();

      })

    },

    /*
    
      run each contract request in order and pass the results
      from each to the next
      
    */
    pipe: function(contract, mainres){

      /*
      
        we pass this onwards through the stack
        
      */
      var lastresults = null;
      var counter = 0;

      async.forEachSeries(contract.body, function(reqdata, next){

        var req = contractfactory.request(reqdata);
        contract.inject(req);
        contract.emit('bootstrap', req);

        req.setHeader('x-contract-index', counter++);

        if(lastresults){
          req.body = lastresults;
        }
        
        var res = contractfactory.response(function(){

          /*
          
            when we are piping we bail out at the first error
            
          */
          if(res.hasError()){
            mainres.error(res.body);
            return;
          }
          
          lastresults = res.body;

          if(_.isEmpty(lastresults)){
            mainres.send();
          }
          else{
            next();
          }
        })

        supplychain(req, res, next);

      }, function(){
        mainres.json(lastresults).send();
      })

    }
  }

  return function(req, res, next){
    /*
    
      we are only interested in quarry/contracts here
      
    */
    if(req.getHeader('content-type')!='quarry/contract'){
      next();
      return;
    }

    var type = req.getHeader('x-contract-type');
    var resolver = resolvers[type];

    if(!resolver){
      next();
      return;
    }

    var parts = req.body.length;

    log.info(dye.yellow('RESOLVE CONTRACT'));

    log.info(type + ' contract : ' + parts + ' part' + (parts==1 ? '' : 's'));

    resolver(req, res, next);
  }
}

