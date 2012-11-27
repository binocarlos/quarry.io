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


Reception.initialize = function(options){
  options || (options = {});
  this.id = utils.quarryid(true);
  
  return this;
}

Reception.network = function(network){
  this.network = network;
  this.switchboard = network.switchboard();
  this.entrypoint = network.supplychain('/');
  this.holdingbay = new HoldingBay({
    id:this.id
  })
  this.register_portals(this.switchboard);
}



Reception.register_portals = function(switchboard){
  var self = this;
  switchboard.listen('reception', 'holdingbay.' + this.id, function(message){

    self.process_message(message);

  })
}

Reception.process_message = function(message){
  var self = this;
  var req = queries.fromJSON(message.request);
  function bay_merge(req){

  }
  var processors = {
    redirect:function(req){
      req.change_path(message.location);
      return self.holdingbay.redirect(req);
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

Reception.handle = function(req, res, next){
  if(req.match('/reception/branch')){
    this.branch(req, res, next);
  }
  else{
    this.request(req, res, next);
  }
}

/*

  A request that will be duplicated for each of the models inside a container

  So a container with 2 models with ids: /testdb/23,/test2/67 will do a branch packet like:


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
    path: '/reception/branch',
    originalPath: '/reception/branch'
}


 */
Reception.branch = function(req, mainres, next){
  var self = this;
  var body = req.body();
  var responses = [];
  
  console.log('-------------------------------------------');
  eyes.inspect(req.toJSON());
  async.forEach(body.routes, function(route, next_route){
    var branch_req = queries.fromJSON(body.request);
    branch_req.assign_route(route);
    self.request(branch_req, function(res){
      mainres.addResponse(res);
      next_route();
    })
  }, function(error){
    
    mainres.send();
  })
}

// make a request down into the network stack
// the callback is run with the completed response
Reception.request = function(req, callback){

  // first register the request with the holdingbay
  // it will return our response that is hooked up
  var res = this.holdingbay.register(req, callback);

  // now run the req/res through our entry function
  // if it calls next the whole network called a 404
  this.entrypoint(req, res, function(){
    res.send404();
  })

}