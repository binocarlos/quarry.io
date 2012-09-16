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
    EventEmitter = require('events').EventEmitter,
    selector_parser = require('./selector'),
    async = require('async');

/*
  Quarry.io Default Supply Chain
  ----------------------

  The default supply chain is an in-memory container that does it's work in RAM with no network



 */

function factory(options){

  options || (options = {})

  function chain(message, next){

    console.log('default supply chain');
    /*
    var root = containerFactory();

    // run the find in the root container
    if(message.action=='select'){
      
    }
    // false append onto the root container
    else if(message.action=='append'){
      var appendData = message.data;

      root.append(containerFactory(appendData));
    }
    */

  }
  return chain;
}

exports = module.exports = factory;
