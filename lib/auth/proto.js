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
var Warehouse = require('../warehouse/proto');

/*
  Quarry.io - Auth
  ----------------

  


 */

module.exports = Auth;

//var Proto = require('./proto');

function Auth(options){
  Warehouse.apply(this, [options]);
}

Auth.prototype.__proto__ = Warehouse.prototype;


/*

  called from the bootloader

 */
Auth.prototype.automount = function(){

  /*
  this.post('/transaction', _.bind(this.transaction, this), {
    debug:process.env.NODE_ENV=='development'
  })

  this.use('/request', _.bind(this.request, this), {
    debug:process.env.NODE_ENV=='development'
  })
  */
}

/*

  assign the network client

 */
Auth.prototype.bootstrap_network = function(deployment, network){

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

Auth.prototype.register_portals = function(switchboard){
  var self = this;

  /*
  switchboard.listen('reception', 'holdingbay.' + this.id, function(message){

    self.process_broadcast(message);

  })
*/
}
