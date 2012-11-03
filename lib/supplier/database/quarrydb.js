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
    eyes = require('eyes'),
    async = require('async'),
    mongo = require('../../clients/mongo'),
    select_helper = require('./quarrydb/select'),
    append_helper = require('./quarrydb/append'),
    save_helper = require('./quarrydb/save');

module.exports = factory;

/*
  Quarry.io RAM Supplier
  -------------------

  In memory supplier

  options
  -------

  {
    
  }

 */

function factory(options){

  options || (options = {});

  options = _.defaults(options, {
    collection:'bob'
  })

  var mongo_client = null;

  function router(warehouse, ready_callback){
    
    // preapre the mongo connection for our collection
    mongo(options, function(error, client){
      mongo_client = client;
      ready_callback && ready_callback(null, warehouse);
    })

    /*

        SELECT - searches for data based on a selector

     */
    warehouse.use('/select', function(packet, next){
      

      console.log('-------------------------------------------');
      eyes.inspect(packet.toJSON());
      select_helper(mongo_client, packet);
      
    })

    /*

        APPEND - add container data to another container's children

     */
    warehouse.use('/append', function(packet, next){

      console.log('-------------------------------------------');
      eyes.inspect(packet.toJSON());
      append_helper(mongo_client, packet);

    })

    /*

        SAVE - add container data to another container's children

     */
    warehouse.use('/save', function(packet, next){

      append_helper(mongo_client, packet);

    })

    /*

        DELETE - remove containers

     */
    warehouse.use('/delete', function(packet, next){

      //append_helper(mongo_client, packet);
    })

  }

  return router;
}