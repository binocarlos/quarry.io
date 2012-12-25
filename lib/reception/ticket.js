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
//var Proto = require('./proto');

module.exports = Ticket;


/*
  Quarry.io - Ticket
  --------------------

  A single query that might branch into several queries to be
  merged at the end


 */

/*


  Constructor




 */

function Ticket(options){
  options || (options = {});
  this.id = utils.quarryid();
  this.bay_id = options.bay_id;
  this.finished_callback = options.finished_callback;
  this.response = queries.response(this.finished_callback);
  this.requests = [];
}

/*

  A message has been emitted to the holdingbay
  and we are to wait for the results of this
  request now as well as the current ones (a branch)

 */
Ticket.prototype.add_request = function(req){
  var self = this;
  req.ticketid(this.id);
  req.bayid(this.bay_id);
  this.requests.push(req);
  return queries.response(function(res){
    self.finish_request(req, res);
  })
}

/*

  A message has been emitted to the holdingbay
  and we are to ignore the last request and replace
  it with this one

 */
Ticket.prototype.replace_request = function(req){
  var self = this;
  req.ticketid(this.id);
  req.bayid(this.bay_id);
  this.requests = [req];
  return queries.response(function(res){
    self.finish_request(req, res);
  })
}

/*

  A request has come back finished for this ticked

  Lets remove the request from our collection
  and check to see if that means we have finished everything

 */
Ticket.prototype.finish_request = function(req, res){
  var self = this;

  this.response.addMultipart(res);
  
  this.requests = _.filter(this.requests, function(testreq){
    return testreq.id!=req.id;
  })

  if(this.requests.length<=0){
    this.send();
  }

}

/*

  Triggered once the requests have all resolved themselves


 */
Ticket.prototype.send = function(){
  this.response.send();
}