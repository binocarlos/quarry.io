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

module.exports = info;

/*

  quarry.io - meta

  a function that returns an analysis of a container skeleton (it's meta data)

  this is used across the system to resolve things like __supplychain tagnames and wotnot



  
*/
function info(skeleton){
  var root = skeleton.supplychainroot==true;
  return {
    databaseroot:root,
    quarrysupplier:skeleton.quarrysupplier,
    quarryid:skeleton.quarryid,
    quarryportal:skeleton.quarryportal,
    containerpath:root ? null : skeleton.quarryid,
    portalparts:root ? null : skeleton.quarryportal,
    links:skeleton.links
  }
}