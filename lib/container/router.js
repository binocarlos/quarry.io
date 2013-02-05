/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */

var utils = require('../utils');
var Info = require('./info');
var eyes = require('eyes');

module.exports = router;

/*

  quarry.io - router

  functions for working out different strings representing a container on the network

  every container came from a supplier
  this is stamped by the supplier on the way out
  the supplier is saved in:

    meta.quarrysupplier (e.g. /database/user34/4545)

  every container also has a quarryid
  therefore we can do REQREP operations using:

    /database/user34/4545/435345345345345

  as a direct route into any container regardless of where it lives inside the supplier

  then there are portal routes

  these are based on a materialized path representing the route in the container tree

  this is used for portals that listen 'into' points in a container tree

  the materialized path for a container can be anything the supplier decides

  for example - the QuarryDB uses an array of positions - that is the 3rd thing, in the 4th thing, in the 1st thing

  filesystems could use the filepath as the materialized path

  suppliers don't need to worry about uniqueness outside of one database
  that is handled because the path is combined with the supplier route for portals



  
*/
function router(skeleton){
  if(!skeleton){
    return {};
  }

  var info = Info(skeleton);

  return {
    link:function(){
      return {
        quarryid:skeleton.quarryid,
        quarrysupplier:skeleton.quarrysupplier
      }
    },
    quarrysupplier:function(){
      return info.quarrysupplier;
    },
    method:function(method, mode){
      if(!mode){
        mode = 'shallow';
      }
      return this[mode + 'method'].apply(this, [method]);
    },
    shallowmethod:function(method){
      return utils.makeroute([method, this.shallow()], '.');
    },
    deepmethod:function(method){
      return utils.makeroute([method, this.deep()], '.');
    },
    rpc:function(){
      return utils.makeroute([skeleton.quarrysupplier, info.containerpath]);
    },
    shallow:function(){
      return utils.makeroute([skeleton.quarrysupplier, info.containerpath], '.');
    },
    deep:function(){
      return utils.makeroute([skeleton.quarrysupplier].concat(info.portalparts || []), '.');
    }
  }
}