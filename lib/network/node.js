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
  switchboard:require('./node/switchboard'),
  apiserver:require('./node/apiserver')
}

module.exports = function(options){
  if(!options){
    throw new Error('test');
  }
  var Proto = flavours[options.flavour];
  return new Proto(options);
}

/*

  things run for the overall network
  
*/
module.exports.networkflavours = [
  'router'
]

/*

  things run for each stack
  
*/
module.exports.stackflavours = [
  'switchboard',
  'reception',
  'apiserver',
  'webserver'
]

/*

  the sockets used for each type
  
*/
module.exports.endpoints = {
  webserver:{
    http:{
      type:'http'
    }
  },
  reception:{
    front:{
      type:'router'
    },
    back:{
      type:'api'
    }
  },
  switchboard:{
    pub:{
      type:'pub'
    },
    sub:{
      type:'sub'
    }
  }
}