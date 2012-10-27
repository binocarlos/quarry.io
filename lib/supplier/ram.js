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

  var cache = cacheFactory({
    data:root_data
  })

  function router(warehouse, ready_callback){
    
    warehouse.use('/select', function(packet, next){

      var previous = packet.req.param('input');
      var selector = packet.req.body();
      var skeleton = packet.req.header('fields')=='skeleton';
      var tree = selector.modifier && selector.modifier.tree ? true : false;

      var results = cache.run_selector(previous, selector);

      var raw_results = _.map(results.toJSON(), function(raw_data){
        if(skeleton){
          return {
            '_meta':raw_data._meta || {}
          }
        }
        var ret = _.extend({}, raw_data);
        if(!tree){
          delete(ret._children);
        }
        return ret;
      })

      packet.res.send(raw_results);
    })

    ready_callback && ready_callback();
  }

  return router;
}