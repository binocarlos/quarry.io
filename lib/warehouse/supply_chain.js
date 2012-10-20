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

module.exports = factory;

/*
  Quarry.io - Supply Chain
  ------------------------

  End point or routing functions

  Each supply chain is a single function that accepts a packet

  It is built with a switchboard and a request chain of it's own (so the warehouse can ask questions)


 */


function factory(){

  

  return warehouse;
}

var SupplyChain = {};

SupplyChain.prototype = {};

/*
  The normal default container model
 */
SupplyChain.prototype.initialize = function(supply_chain){

  // this middleware stack for this warehouse
  // each method will match on the route & path
  this.stack = [];

  // we register events against the containers we have produced
  // this lets us come out of object into serialized state and for
  // the event handlers to be reistered
  //
  // this object is a map of handlers by container id
  this.events = {};

  this.supply_chain = supply_chain || function(packet, callback){
    callback(null, packet);
  }

  /*
    
   */
  this.container_model = Base.extend({

    /*
      The overridden sync method that speaks to our supply chain
     */
    sync:function(method, model, options){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('BACBONE SYNC');
      console.log(method);
      console.log(model);
      console.log(options);
    }
  })
}