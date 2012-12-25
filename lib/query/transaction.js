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
var eyes = require('eyes');
var queries = require('./factory');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var Request = require('./request');
var Response = require('./response');


/*
  Quarry.io - Transaction
  -----------------------

  Looks after the combination of a REQ/REP loop and the feedback from the
  switchboard about that request

  It offers a rollback function to reverse the changes

  It also offers a confirm function which will merge in id's from the server

  The client changing the data will affect their local copy
  and register a rollback function

  The REQ/REP loop will tell the client whether or not to keep
  their changes



  

 */

module.exports = Transaction;

function Transaction(options){
  _.extend(this, EventEmitter.prototype);

  options || (options = {});
  this.options = options;

  this.id = utils.quarryid();

  // the request that is our template for the input
  this.query = options.query;
  this.container = options.container;

  if(this.options.router){
    this.router = this.options.router;
  }
}

/*

  The default router - looks at the request method
  and picks the route from that

 */
Transaction.prototype.router = function(model){
  var routes = model.router();

  if(routes[this.query.method()]){
    return routes[this.query.method()];
  }
  else if(routes.all){
    return routes.all;
  }
}

Transaction.prototype.debug = function(fn){
  var self = this;
  _.each(this.container.switchboards, function(switchboard){
    switchboard.listen('transaction', self.id, function(message){
      fn && fn.apply(self, [message]);
    })
  })
  this.debugmode = true;
  
  return this;
}

Transaction.prototype.cleanup = function(){
  _.each(this.container.switchboards, function(switchboard){
    switchboard.removeAll('transaction', self.id);
  })
  return this;
}

Transaction.prototype.ship = function(fn){
  var self = this;

  if(!this.query){
    this.emit('error', 'There is no query defined for the transaction');
    return;
  }

  var req = new Request({
    method:'post',
    path:'/reception/transaction',
    body:this.query.toJSON()
  })

  req.transactionid(this.id);
  this.debugmode && req.debugmode(true);
  /*

    Here we bake the routes into the skeleton

    This means the skeleton contains the base data plus the route for this query

   */
  req.jsonheader('X-QUARRY-SKELETON', this.container.models.map(function(model){
    return _.extend({}, model.skeleton(), {
      route:self.router(model)
    })
  }))
  
  /*

    The reception transaction handler will return a multi-part response

    The indexes line up with the skeleton input

   */
  this.container.handle(req, function(res){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    //eyes.inspect(res.toJSON());
    console.log('done');

    /*
    var hasError = false;

    _.each(res.body(), function(resjson, skeleton_index){
      var res = new Response(resjson);

      if(res.hasError()){
        hasError = true;
        self.emit('error', res);
      }
      else{
        self.emit('result', res);
      }
    })

    if(hasError){
      self.rollback();
    }
    else{
      self.commit();
    }
    */
  })

}