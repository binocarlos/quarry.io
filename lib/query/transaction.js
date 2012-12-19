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
  options || (options = {});
  this.options = options;
  this.id = utils.quarryid();

  this.handle = options.handle || function(){
    throw new Error('there is no handle defined for the transaction')
  }
  this.rollback = this.options.rollback || function(){}
  this.commit = this.options.commit || function(){}
  _.extend(this, EventEmitter.prototype);
}

Transaction.prototype.run = function(req){
  var self = this;
  this.handle(req, function(res){
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    eyes.inspect(res.toJSON());

    var hasError = false;

    _.each(res.body(), function(resjson){
      var res = queries.resfromJSON(resjson);

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
  })
}