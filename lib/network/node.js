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

var _ = require('lodash');

var flavours = {
  router:require('./node/router'),
  webserver:require('./node/webserver'),
  reception:require('./node/webserver'),
  apiserver:require('./node/webserver')
}

module.exports = function(config){
  var Proto = flavours[config.flavour];
  return new Proto(config);
}

module.exports.networkflavours = [
  'router'
]

module.exports.stackflavours = [
  'webserver',
  'reception',
  'apiserver'
]