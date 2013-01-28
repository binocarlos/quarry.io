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
var Container = require('./proto');

function factory(data){
  if(_.isString(data)){
    // we assume XML
    if(data.match(/^\s*\</)){
      data = XML.parse(data);
    }
    // or JSON string
    else if(data.match(/^\s*[\[\{]/)){
      data = JSON.parse(data);
    }
    // we could do YAML here
  }
  else if(!_.isArray(data)){
    data = [data];
  }

  function instance(){
    return instance.handle.apply(instance, arguments);
  }

  _.extend(instance, Container.prototype);

  instance.initialize(data);

  return instance;
}

function create(tagname, attr){
  return factory([{
    meta:{
      tagname:tagname
    },
    attr:attr
  }])
}

module.exports = {
  new:create,
  factory:factory
}