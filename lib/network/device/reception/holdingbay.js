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
var deck = require('deck');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var log = require('logule').init(module, 'Reception Router');
var ContractResolver = require('../../../warehouse/resolvecontract');
var Contract = require('../../../contract');
var ResolvingRequest = require('./resolvingrequest');

module.exports = HoldingBay;

/*
  Quarry.io - Reception Holdingbay
  --------------------------------

  keeps hold of the resolving contracts

  listens on the switchboard for feedback loops

 */

function HoldingBay(options){

  var switchboard = options.switchboard;

  if(!switchboard){
    throw new Error('HoldingBay Server requires a switchboard');
  }

  var holdingbay = {
    /*
    
      the id that will be used on the switchboard feedback loop
      
    */
    id:utils.littleid(),

    /*
    
      a map of currently resolving contracts by id

      each entry is an array of objects representing the queries status

      if a query branches at any point then it's representation will be added
      to the array of queries tagged by the original request id

      the new branch is sent out as it's own contract but the results
      sent and monitored here
      
    */
    resolving:{},

    /*
    
      a list of functions to call for a stampid response
      
    */
    triggers:{},

    /*
    
      add a new contract - this can be either from new
      or a recusrive feedback loop via the switchboard

      socket is:

        front
        loopback

      it determines where the answer is written

      socketid    requestid    header    packet
      
    */
    handlefront:function(frames){
      var self = this;

      /*
      
        these two must end up in the final response
        
      */
      var socketid = frames[0].toString();
      var rpcid = frames[1].toString();
      var packet = JSON.parse(frames[2].toString());

      var mainreq = Contract.request(packet);
      var mainres = Contract.response(function(){
        self.emit('dispatch:front', [socketid, rpcid, JSON.stringify(mainres.toJSON())]);
      })

      this.handle(mainreq, mainres, function(){
        mainres.send404();
      })
    },


    /*
    
      socketid    requestid    header    packet
      
    */
    handleback:function(frames){

      var socketid = frames[0];
      var requestid = frames[1].toString();
      var res = Contract.response(JSON.parse(frames[2].toString()));

      var resolvingrequest = this.resolving[requestid];

      if(!resolvingrequest){
        throw new Error('there is no resolving request for id: ' + requestid);
      }

      resolvingrequest.maincomplete(res);
    },


    handle:function(mainreq, mainres, next){
      var self = this;

      /*
      
        are we resolving a contract here
        
      */
      if(mainreq.getHeader('content-type')=='quarry/contract'){
        self.contractresolver(mainreq, mainres, function(){
          mainres.send404();
        })
      }
      /*
      
        or are we routing the request directly
        
      */
      else{

        self.handlerequest(mainreq, mainres, function(){
          mainres.send404();
        })

      }

    },

    /*
    
      a single request that might branch

      we hold back from the callback until all branches are resolved
      
    */
    handlerequest:function(req, res, next){
      var self = this;

      var resolve = new ResolvingRequest(self.id, req, res);
      this.resolving[resolve.id] = resolve;

      resolve.on('complete', function(){
        delete(self.resolving[resolve.id]);
      })

      var frames = [resolve.id, JSON.stringify(req.toJSON())];
      
      this.emit('dispatch:back', req.getHeader('x-quarry-department'), req.path, frames);

      return resolve;
    },

    /*
    
      a branch feedback adds another request to the contract
      and sends it through ourselves to resolve recursively
      
    */
    feedback:function(message){
      var self = this;

      if(message.action=='branch'){

        eyes.inspect(message);

        var parentstampid = message.stampid;
      
        var branchreq = Contract.request(message.request);
        var branchstampid = branchreq.getHeader('x-quarry-baystampid')

        /*
        
          add in the branch to the parent resolve
          
        */
        var resolve = this.resolving[parentstampid];

        if(!resolve){
          throw new Error('there was switchboard feedback but no resolve for id: ' + parentstampid);
        }

        /*
        
          tell the resolve we are waiting for a branch
          
        */
        resolve.branch(branchstampid);

        /*
        
          this is for when the branch has completed

          it has it's own branching sub-system also
          
        */
        var branchres = Contract.response(function(){
          resolve.branchcomplete(branchstampid, branchres);
        })

        self.handlerequest(branchreq, branchres, function(){
          branchres.send404();
        })
      }
    }
  }

  _.extend(holdingbay, EventEmitter.prototype);

  var supplychain = _.bind(holdingbay.handle, holdingbay);

  supplychain.switchboard = switchboard;

  holdingbay.contractresolver = ContractResolver(supplychain);

  switchboard.listen('holdingbay.' + holdingbay.id, function(message){

    holdingbay.feedback(message);

  })

  return holdingbay;
}