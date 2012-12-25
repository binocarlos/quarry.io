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


Reception.setup = function(){
  this.post('/reception/transaction', _.bind(this.transaction_request, this));
}

/*

  assign the network client

 */
Reception.network = function(network){
  this.network = network;
  this.switchboard = network.switchboard();
  this.entrypoint = network.supplychain('/');
  this.holdingbay = new HoldingBay({
    id:this.id
  })
  this.register_portals(this.switchboard);
}


/*

  Hook up to the portals for the feedback loops for the
  requests going through

 */

Reception.register_portals = function(switchboard){
  var self = this;
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
  function bay_merge(req){

  }
  var processors = {
    redirect:function(req){
      req.reroute(message.location);
      return self.holdingbay.replace(req);
    },
    branch:function(req){
      return self.holdingbay.branch(req);
    }
  }

  if(!processors[message.action]){
    throw new Error('No processor found for: ' + message.action);
  }

  var res = processors[message.action].apply(this, [req]); 

  this.entrypoint(req, res, function(){
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
Reception.transaction_request = function(mainreq, mainres, next){
  var self = this;
  var body = mainreq.body();
  var responses = [];

  var index = 0;

  /*

    A transaction is a request for each of the models in a container

    It is basically a top-level branch

   */
  mainres.multipart();

  var skeleton_array = mainreq.jsonheader('X-QUARRY-SKELETON') || [];

  async.forEach(skeleton_array, function(skeleton, next_skeleton){

    /*
    req.debug({
      action:'transaction-branch',
      skeleton:skeleton
    })
    */

    var branch_req = queries.fromJSON(body);

    mainreq.copyinto(branch_req);
    branch_req.path(skeleton.route);
    branch_req.skeleton([skeleton]);

    console.log('-------------------------------------------');
    eyes.inspect(mainreq.broadcast.toString());
    mainreq.debug({
      action:'reception_branch',
      skeleton:skeleton
    })

    self.request(branch_req, function(res){
      mainres.addMultipart(res);
      next_skeleton();
    })
  }, function(error){
    
    mainres.send();
  })

  
  
}

// make a request down into the network stack
// the callback is run with the completed response
Reception.generic_request = function(req, res, next){

  // first register the request with the holdingbay
  // it will return our response that is hooked up
  var res = this.holdingbay.register(req, callback);

  // now run the req/res through our entry function
  // if it calls next the whole network called a 404
  this.entrypoint(req, res, function(){
    res.send404();
  })

}