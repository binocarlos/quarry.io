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
    contracts:{},

    /*
    
      a map of callback fn's by contract id
      
    */
    callbacks:{},

    branchfunctions:{},



    /*
    
      a single request that might branch

      we hold back from the callback until all branches are resolved
      
    */
    handlerequest:function(header, packet, callback){
      var self = this;
      /*
      
        what we insert into the request header on it's way back to the api servers
        
      */
      var injectheader = {
        bayid:self.id,
        phaseid:utils.quarryid()
      }

      /*
      
        combine the new data into the header
        
      */
      var newheader = JSON.stringify(_.extend({}, header, injectheader));

      var requestid = utils.quarryid();

      this.callbacks[requestid] = callback;

      var frames = [requestid, newheader, packet];

      this.emit('dispatch:back', header.path, frames);
    },

    /*
    
      socketid    requestid    header    packet
      
    */
    handleback:function(frames){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('back');
      process.exit();
      var socketid = frames[0];
      var requestid = frames[1].toString();
      var header = frames[2];
      var packet = frames[3];

      var callback = this.callbacks[requestid];
      if(callback){
        callback(header, packet);
        delete(this.callbacks[requestid]);
      }
    },

    handlecontract:function(header, packet, callback){
      var req = Contract.request(JSON.parse(packet.toString()));
      var res = Contract.response(function(){
        callback(header, res.toJSON());
      })

      this.resolver(req, res, function(){
        res.send404();
      })

    },

    /*
    
      called by the resolver to get a packet out to the network  
      
    */
    resolve:function(req, res, next){
      var header = req.getcontractheader();
      var requeststring = JSON.stringify(req.toJSON());

      this.handlerequest(header, requeststring, function(error, responsepacket){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('after resolver');
      })
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
        self.handlerequest(header, packet, callback);
      }

    },

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

    }


  }

  _.extend(holdingbay, EventEmitter.prototype);

  holdingbay.resolver = ContractResolver(_.bind(holdingbay.resolve, holdingbay));

  switchboard.listen('holdingbay.' + holdingbay.id, function(message){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('Holding bay feedback');

    eyes.inspect(message);
  })

  return holdingbay;
}