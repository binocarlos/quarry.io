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
var HoldingBay = require('./HoldingBay');
var queries = require('../query/factory');

//var Proto = require('./proto');

var Reception = module.exports = {};


/*
  Quarry.io - Reception
  ---------------------

  


 */

/*


  Constructor




 */


Reception.boot = function(){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('DOING RECEPTION SETUP');
  
  this.holdingbay = new HoldingBay({
    id:this.id
  })
}

/*

  called from the bootloader

 */
Reception.automount = function(){

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('DOING RECEPTION AUTOMOUNT');

  this.post('/transaction', _.bind(this.transaction, this), {
    debug:true
  });
}

/*

  assign the network client

 */
Reception.assign_network_client = function(network){

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('RECEPTION NETWORK');

  this.network = network;
  this.switchboard = network.pubsub('/reception/switchboard/');
  
  /*

    get a supply chain to the root for requests

   */
  this.entrypoint = this.network.rpc('/');

  this.register_portals(this.switchboard);
}


/*

  Hook up to the portals for the feedback loops for the
  requests going through

 */

Reception.register_portals = function(switchboard){
  var self = this;

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.log('RECEPTION PORTALS');

  switchboard.listen('reception', 'holdingbay.' + this.id, function(message){

    self.process_broadcast(message);

  })
}

/*

  Process a message from the feedback loops

 */
Reception.process_broadcast = function(message){
  var self = this;
  var req = queries.fromJSON(message.request);
  
  var processors = {
    redirect:function(req){
      return self.holdingbay.redirect(req, message);
    },
    branch:function(req){
      return self.holdingbay.branch(req, message);
    }
  }

  if(!processors[message.action]){
    throw new Error('No processor found for: ' + message.action);
  }

  var res = processors[message.action].apply(this, [req]); 
  var entrypoint = this.network.rpc('/');

  entrypoint(req, res, function(){
    res.send404();
  })
}



/*

  FRONT DOOR BRANCH

  this is for when a client container is an array of several models

  then if an 'append' happens we send a packet to /reception/branch
  with the template request and a list of routes

  this handler spawns a new request for each of the routes and triggers 
  a self.request for it

  the index keeps track of which route in a branch is reporting back
  

{
    id: '8fc0d10b616de32b00e8c450',
    method: 'post',
    body: {
        request: {
            params: {
                selector: [ 'folder city, apples' ]
            },
            method: 'get'
        },
        routes: [
            { path: '/testdb/23' },
            { path: '/test2/67' }
        ]
    },
    path: '/reception/transaction',
    originalPath: '/reception/transaction'
}


 */
Reception.transaction = function(mainreq, mainres, next){
  var self = this;

  /*
  
    This is the body request that will be sent out for each
    container in the main skeleton

   */
  var body = mainreq.body();

  
  
  /*

    The skeleton of containers that form the context of this transaction

   */
  var skeleton_array = mainreq.jsonheader('X-QUARRY-SKELETON') || [];

  /*
  
    Make a new ticket with the holding bay for this transaction
    
  */
  var ticket = this.holdingbay.ticket(mainres);

  var index = 0;
  /*

    Loop over each skeleton and register the request with the ticket

   */
  async.forEach(skeleton_array, function(skeleton, next_skeleton){

    /*
    req.debug({
      action:'transaction-branch',
      skeleton:skeleton
    })
    */

    var branch_req = queries.fromJSON(body);
    
    mainreq.copyinto(branch_req);
    branch_req.transactionindex(index++);
    branch_req.path(skeleton.route);
    branch_req.skeleton([skeleton]);
    
    var branch_res = ticket.add(branch_req);

    mainreq.debug({
      action:'reception_branch',
      skeleton:skeleton
    })

    self.entrypoint(branch_req, branch_res, function(){
      branch_res.send404();
    })

  }, function(error){
    
    this.holdingbay.completed(ticket);
    mainres.send();
  })

}