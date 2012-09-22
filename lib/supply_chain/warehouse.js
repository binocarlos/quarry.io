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

var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    containerFactory = require('../container'),
    async = require('async');
    
/*
  Quarry.io Warehouse Supply Chain
  --------------------------------

  2 step supplier that triggers middleware for the context results to load from other places

  you base the base supplier - you can add middleware functions that will
  branch for context results

  every message is analyzed so the correct supply_chain is found for it

 */



function factory(router){

  var warehouse = function(packet, callback){

    // route the packet to get the supply chain and route to use for containers
    router(packet.route, function(error, supply_chain){

      if(error || !supply_chain){
        packet.answer = {
          ok:false,
          error:error
        }
        callback(error, packet);
      }
      // now trigger the supply chain with the message (if we have one)
      !error && supply_chain && supply_chain(packet, callback);
    })

  }

  return warehouse;
}

// expose createModule() as the module
exports = module.exports = factory;

