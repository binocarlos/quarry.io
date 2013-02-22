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
    
      a map of callback fn's by contract id
      
    */
    callbacks:{},

    branchfunctions:{},



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
      
      /*
      
        this is now what we are resolving
        
      */
      var header = JSON.parse(frames[2].toString());
      var packet = frames[3];

      this.handlepacket(header, packet, function(resheader, respacket){
        self.emit('dispatch:front', [socketid, rpcid, resheader, respacket]);
      })

    },


    handlecontract:function(header, packet, callback){
      var req = Contract.request(JSON.parse(packet.toString()));
      var res = Contract.response(function(){
        callback(JSON.stringify(header), JSON.stringify(res.toJSON()));
      })

      this.resolver(req, res, function(){
        res.send404();
      })

    },

    /*
    
      a single request that might branch

      we hold back from the callback until all branches are resolved
      
    */
    handlerequest:function(header, packet, callback){
      var self = this;

      this.callbacks[header.baystampid] = callback;

      var frames = [header.baystampid, JSON.stringify(header), packet];

      this.emit('dispatch:back', header.path, frames);
    },

    /*
    
      socketid    requestid    header    packet
      
    */
    handleback:function(frames){

      var socketid = frames[0];
      var requestid = frames[1].toString();
      var header = JSON.parse(frames[2].toString());
      var packet = JSON.parse(frames[3].toString());
      var callback = this.callbacks[requestid];
      if(callback){
        callback(null, header, packet);
        delete(this.callbacks[requestid]);
      }
    },

    /*
    
      called by the resolver to get a packet out to the network  
      
    */
    resolve:function(req, res, next){

      var self = this;
      /*
      
        combine the new data into the header
        
      */
      var header = _.extend({}, req.getcontractheader(), {
        bayid:self.id,
        /*
        
          each request on its way out get a stampid

          this is used to track any branching requests
          
        */
        baystampid:utils.quarryid()
      })

      var resolve = {
        id:header.baystampid,
        requeststatus:{},
        iscompleted:function(){
          return _.every(this.requeststatus, function(finished, id){
            return finished!=false;
          })
        },
        ismultiple:function(){
          return _.keys(this.requeststatus).length>1;
        },
        branch:function(id){
          this.requeststatus[id] = false;
          return this;
        },
        complete:function(id, answerres){
          this.requeststatus[id] = answerres;
          answerres.setHeader('x-json-reception-header', header);
          res.add(answerres);
          
          if(this.iscompleted()){

            res.send();

            delete(self.resolving[resolve.id]);
          }
        }
      }

      resolve.requeststatus[header.baystampid] = false;

      this.resolving[resolve.id] = resolve;

      this.handlerequest(header, JSON.stringify(req.toJSON()), function(error, header, responsepacket){

        var response = Contract.response(responsepacket);
        var branches = res.getHeader('x-json-branches') || [];

        /*
        
          the request has branched - we will wait for all answers
          
        */
        if(branches.length>0){

          _.each(branches, function(branchid){
            resolve.branch(branchid);
          })
        }

        resolve.complete(header.baystampid, response);
        
      })
    },

    /*
    
      a branch feedback adds another request to the contract
      and sends it through ourselves to resolve recursively
      
    */
    feedback:function(message){
      var self = this;
      if(message.action=='branch'){
        eyes.inspect(message);
        var header = message.header;
        var branchreq = Contract.request(message.request);
        branchreq.setHeader('x-json-reception-header', header);
        /*
        
          add in the branch to the parent resolve
          
        */
        var resolve = this.resolving[header.baystampid];
        resolve.branch(header.branchid);
        
        /*
        
          here we switch it into it's own resolve
          
        */
        header.baystampid = header.branchid;

        /*
        
          this is for when the branch has completed

          it has it's own branching sub-system also
          
        */
        var branchres = Contract.response(function(){

          resolve.complete(header.branchid, branchres);

        })

        self.resolve(branchreq, branchres, function(){
          branchres.send404();
        })
      }
    },

    handlepacket:function(header, packet, callback){
      var self = this;

      /*
      
        are we resolving a contract here
        
      */
      if(header.contenttype=='quarry/contract'){
        self.handlecontract(header, packet, callback);
      }
      /*
      
        or are we routing the request directly
        
      */
      else{

        var req = Contract.request(packet);
        var res = Contract.response(function(){
          callback(null, res.toJSON());
        })

        self.resolve(req, res, function(){
          res.send404();
        })
      }

    }



  }

  _.extend(holdingbay, EventEmitter.prototype);

  var supplychain = _.bind(holdingbay.resolve, holdingbay);

  supplychain.switchboard = switchboard;

  holdingbay.resolver = ContractResolver(supplychain);

  switchboard.listen('holdingbay.' + holdingbay.id, function(message){

    holdingbay.feedback(message);

  })

  return holdingbay;
}