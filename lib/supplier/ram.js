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
    cacheFactory = require('../container/cache'),
    async = require('async');

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

  var root_data = options.data || [];

  function router(warehouse, ready_callback){
    
    var cache = cacheFactory(warehouse, {
      data:root_data,
      create_ids:true
    })

    /*

        SELECT - searches for data based on a selector

     */
    warehouse.use('/select', function(packet, next){
      var previous = packet.req.param('input');
      var selector = packet.req.body();
      var skeleton = packet.req.header('fields')=='skeleton';
      var tree = selector.modifier && selector.modifier.tree ? true : false;

      var results = cache.run_selector(previous, selector);

      var raw_results = warehouse.process_results(results, {
        skeleton:skeleton,
        tree:tree
      })

      packet.res.send(raw_results);
    })

    /*

        HEAD - get just the _meta for a single container

     */
    warehouse.use('/head', function(packet, next){

      var quarryid = packet.req.param('quarryid');
      var tree = !_.isEmpty(packet.req.param('tree'));

      var container = cache.by_id(quarryid);

      var raw_results = warehouse.process_results(container.toJSON(), {
        skeleton:true,
        tree:tree
      })

      packet.res.send(raw_results);
    })

    /*

        APPEND - add container data to another container's children

     */
    warehouse.use('/append', function(packet, next){

      var appenddata = packet.req.param('input');

      var changed_actions = cache.append(appenddata, packet.req.body());

      packet.res.send(changed_actions);
    })

    /*

        SAVE - add container data to another container's children

     */
    warehouse.use('/save', function(packet, next){

      var savedata = packet.req.param('input');

      var changed_actions = cache.save(savedata, packet.req.body());

      packet.res.send(changed_actions);
    })

    /*

        DELETE - remove containers

     */
    warehouse.use('/delete', function(packet, next){

      var previous = packet.req.param('input');

      var changed_actions = cache.delete(previous);

      packet.res.send(changed_actions);
    })

    ready_callback && ready_callback(null, cache);
  }

  return router;
}