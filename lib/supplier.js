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
  Quarry.io - Supplier
  --------------------

  Extension to warehouse that is an endpoint

  


 */


/*
  Module dependencies.
*/

var _ = require('underscore');
var async = require('async');
var Warehouse = require('./warehouse');
var selectorParser = require('./container/selector');
var packetFactory = require('./packet');
var util = require("util");
var eyes = require('eyes');

module.exports = Supplier;

/*
  Create a full on supplier warehouse with an object
  that has the methods provided by this supplier

  The warehouse looks after generic contract stuff
  The supplier looks after turning a 'selector' into a contract
 */

module.exports.factory = function(api, config){
  var supplier_warehouse = new Supplier(config);

  /*

    The select reduction

   */

  supplier_warehouse.use('/selector', function(packet, next){

    var mergePacket = packetFactory();

    var phases = selectorParser(packet.req.body());

    _.each(phases, function(phase){
      var pipePacket = packetFactory();

      // the input for the pipe
      pipePacket.req.param('input', packet.req.param('input'));

      _.each(phase, function(selector, select_index){
        var selectPacket = packetFactory();
        selectPacket.path('/select');
        selectPacket.req.body(selector);

        pipePacket.pipe(selectPacket);
      })


      mergePacket.merge(pipePacket);
    })

    supplier_warehouse.run(mergePacket, function(answerPacket){
      packet.res.send(answerPacket.res.body());
    })
  })

  /*
    The main API mapper

   */
  supplier_warehouse.use(function(packet, next){

      var path = packet.req.path();

      /*
        Do we have a direct method in the api for this path?
       */
      if(api[path]){
        api[path].apply(supplier_warehouse, [packet]);
      }
      else{

        next();
      }
  })




  return supplier_warehouse;
}

function Supplier(config){
  Warehouse.apply(this, [config]);
}

util.inherits(Supplier, Warehouse);