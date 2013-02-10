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

var Contract = require('./contract/proto');
var Request = require('./contract/request');
var Response = require('./contract/response');

/*
  Quarry.io - Network
  -------------------

  


 */

module.exports = {
  factory:factory,
  request:request,
  response:response
}

function factory(type){
  var ret = new Contract();
  type && ret.setType(type);
  return ret;
}

function request(data){
  return new Request(data);
}

function response(data){
  return Response.factory(data);
}