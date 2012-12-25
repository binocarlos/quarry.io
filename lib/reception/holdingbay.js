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
var queries = require('../query/factory');
var Ticket = require('./ticket');
//var Proto = require('./proto');

module.exports = HoldingBay;


/*
  Quarry.io - HoldingBay
  ----------------------

  Keeps track of branching queries inside of the reception


 */

/*


  Constructor




 */

function HoldingBay(options){
  options || (options = {});
  this.id = options.id || utils.quarryid();
  this.tickets = {};
}

HoldingBay.prototype.process_message = function(message){
  if(!this[message.action]){
    throw new Error(message.action + ' was not found on the holdingbay');
  }

  return this[message.action].apply(this, [message]);
}

HoldingBay.prototype.make_ticket = function(callback){
  return new Ticket({
    bay_id:this.id,
    finished_callback:callback
  })
}

HoldingBay.prototype.register = function(req, callback){

  var ticket = this.make_ticket(callback);

  this.tickets[ticket.id] = ticket;

  return ticket.add_request(req);
}


HoldingBay.prototype.replace = function(req){
  var ticket = this.tickets[req.ticketid()];
  return ticket.replace_request(req);
}

HoldingBay.prototype.branch = function(req){
  var ticket = this.tickets[req.ticketid()];
  return ticket.add_request(req);
}

