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

var _ = require('lodash');

var Proto = require('./infrastructure/proto');

module.exports = factory;

var flavour = {
  development:require('./infrastructure/development'),
  local:require('./infrastructure/local'),
  cloud:require('./infrastructure/cloud')
}

function factory(type, options){

  var api = flavour[type] || flavour.development;

  _.each(Proto.interface, function(method){
    if(!_.isFunction(api[method])){
      throw new Error(method + ' required in the Infrastructure api');
    }
  })

  var infrastructure = new Proto(options);

  _.extend(infrastructure, api);

  return infrastructure;
}