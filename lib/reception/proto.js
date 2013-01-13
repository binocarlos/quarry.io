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
var router = require('../query/router');
var Warehouse = require('../warehouse/proto');

/*
  Quarry.io - Reception
  ---------------------

  


 */

module.exports = Reception;

//var Proto = require('./proto');

function Reception(options){
  Warehouse.apply(this, [options]);

  this.holdingbay = new HoldingBay({
    id:this.id
  })
}

Reception.prototype.__proto__ = Warehouse.prototype;


/*

  called from the bootloader

 */
Reception.prototype.automount = function(){
  this.post('/transaction', _.bind(this.transaction, this), {
    debug:process.env.NODE_ENV=='development'
  });
}

/*

  assign the network client

 */
Reception.prototype.bootstrap_network = function(deployment, network){

  Warehouse.prototype.bootstrap_network.apply(this, [deployment, network]);
  
  this.network = network;
  this.switchboard = network.pubsub();
  
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

Reception.prototype.register_portals = function(switchboard){
  var self = this;

  switchboard.listen('reception', 'holdingbay.' + this.id, function(message){

    self.process_broadcast(message);

  })
}

/*

  Process a message from the feedback loops

 */
Reception.prototype.process_broadcast = function(message){
  var self = this;
  var req = queries.fromJSON(message.request);

  var response_factories = {
    redirect:function(req){
      req.reroute(message.location);
      return self.holdingbay.redirect(req);
    },
    branch:function(req){
      return self.holdingbay.branch(req);
    }
  }

  if(!response_factories[message.action]){
    throw new Error('No processor found for: ' + message.action);
  }

  var res = response_factories[message.action].apply(this, [req]); 

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
Reception.prototype.transaction = function(mainreq, mainres, next){
  var self = this;

  mainreq.debug({
    location:'reception/transaction',
    action:'start',
    req:mainreq.summary()
  })

  var branches = this.get_transaction_branches(mainreq, mainres);
  
  /*

    Loop over each skeleton and register the request with the ticket

   */
  async.forEach(branches, function(branch, next_branch){

    mainreq.debug({
      location:'reception/transaction',
      action:'branch',
      req:branch.req.summary()
    })

    self.entrypoint(branch.req, branch.res, function(){
      branch.res.send404();
    })

  }, function(error){
    
    

  })

}

/*

  knows how to split a transaction request out into the seperate branch requests
  on the network
  
*/
Reception.prototype.get_transaction_branches = function(mainreq, mainres){
  var self = this;

  /*
  
    Make a new ticket with the holding bay for this transaction
    
  */
  var ticket = this.holdingbay.ticket(mainres);

  var router_mode = mainreq.routermode() || 'post';

  /*

    The skeleton of containers that form the context of this transaction

   */
  var skeleton_array = mainreq.contentType()=='quarry/skeleton' ? mainreq.body() : (mainreq.jsonheader('X-QUARRY-SKELETON') || []);

  /*
  
    reset the main request because we have extracted the skeleton from the body
    and are about to duplicate it
    
  */
  mainreq.contentType()=='quarry/skeleton' && mainreq.body('');
  
  /*
  
    we then 'route' the skeleton which works out where to send the request
    for each of the skeletons (based on the method and routes table)
    
  */
  var routed_skeleton_array = _.map(skeleton_array, function(skeleton){

    // get the route for 'into' the container because we are
    return router.skeleton(skeleton, router_mode);
  })

  /*

    We add each top-level branching request to the ticket

   */
  var branches = _.map(routed_skeleton_array, function(singleskeleton){

    

    /*
    
      the request is a skeleton for a PUT request

      we duplicate and route each skeleton as a seperate request
      
    */
    if(mainreq.contentType()=='quarry/skeleton'){

      var branch_req = queries.fromJSON(JSON.parse(JSON.stringify(mainreq.toJSON())));

      
      branch_req.method(branch_req.skeletonmethod());
      branch_req.body([singleskeleton]);
      branch_req.refreshid();
      branch_req.resetroute(':reception', singleskeleton.route);  
    }
    /*
    
      otherwise we are duplicating a template request out for each of the skeletons

      this is for GET, POST and DELETE
      
    */
    else{
      
      var branch_req = queries.fromJSON(JSON.parse(JSON.stringify(mainreq.body())));
      mainreq.copyinto(branch_req);
      branch_req.skeleton([singleskeleton]);
      branch_req.refreshid();
      branch_req.resetroute(':reception', singleskeleton.route);
    }

    var branch_res = ticket.add(branch_req);

    return {      
      req:branch_req,
      res:branch_res
    }
    
  })

  /*
  
    the end of request is fired by the holdingbay which
    has registered mainres into a ticket
    
  */
  mainres.on('send', function(){
    self.holdingbay.completed(ticket);
  })

  return branches;

}