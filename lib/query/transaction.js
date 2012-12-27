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
  this._ready_callbacks = [];

  this._shipping = false;
  this._completed = null;

  if(this.options.router){
    this.router = this.options.router;
  }

  if(this.options.filter){
    this.filter = this.options.filter;
  }
}

Transaction.prototype.filter = function(results){
  return results;
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
  var self = this;
  _.each(this.container.switchboards, function(switchboard){
    switchboard.removeAll('transaction', self.id);
  })
  return this;
}

Transaction.prototype.complete = function(results){
  var self = this;
  self._shipping = false;
  self._completed = results;

  _.each(this._ready_callbacks, function(fn){
    fn(results);
  })
}

Transaction.prototype.each = function(fn){
  this.ship(function(results){
    if(results._is_quarry_container){
      results.each(fn);
    }
  })
}

Transaction.prototype.ship = function(fn){
  var self = this;

  if(!this.query){
    this.emit('error', 'There is no query defined for the transaction');
    return;
  }

  if(this._completed){
    fn && fn(this._completed);
    return this;
  }
  else if(this._shipping){
    fn && this._ready_callbacks.push(fn);
    return this;
  }

  fn && this._ready_callbacks.push(fn);
  this._shipping = true;
  
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
  req.jsonheader('X-QUARRY-SKELETON', this.container.skeleton());
  
  /*

    The reception transaction handler will return a multi-part response

    The indexes line up with the skeleton input

   */
  this.container.handle(req, function(mainres){
    
    
    var results = [];

    _.each(mainres.multipartResponses(), function(multires){

      if(multires.hasError()){
        self.emit('error', multires);
      }
      else{
        
        if(multires.transactionindex()){
          var index_container = self.container.eq(multires.transactionindex());

          self.emit('commit', index_container, multires);
        }

        var result = multires.body();

        if(_.isArray(result)){
          results = results.concat(result);
        }
      }
      
    })

    /*

      The final callback

     */
    self.emit('results', results);
    self.complete(self.filter(results));

  })

}