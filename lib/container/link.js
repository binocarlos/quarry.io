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

module.exports = link;

/*

  quarry.io - link

  generates link data that can be appended or assigned to another
  containers children or attributes

  the link is basicallly a very reduced skeleton of the target
  as attributes with a __symlink tagname

  
*/
function link(router){

  return {
    meta:{
      tagname:'__symlink'
    },
    attr:router.link()
  }
}