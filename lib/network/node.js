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
  reception:require('./node/reception'),
  apiserver:require('./node/apiserver')
}

module.exports = function(container){
  var Proto = flavours[container.attr('flavour')];
  return new Proto(container);
}

module.exports.networkflavours = [
  'router'
]

module.exports.stackflavours = [
  'webserver',
  'reception',
  'apiserver'
]

module.exports.endpoints = {
  reception:function(worker, resolver){

    return {
      front:resolver(worker, 'reception.front'),
      pub:resolver(worker, 'reception.pub'),
      sub:resolver(worker, 'reception.sub'),
      back:resolver(worker, 'reception.back')
    }

  }
}