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
    fs = require('fs'),
    async = require('async');
    
/*
  Quarry.io RAM Supplier
  ----------------------

  The default supplier - this just looks through in-memory data

  Everything passed in and returned is RAW JSON

  We map onto containers to do the checking

  options
  -------

  {
    
  }

 */



function factory(options){

  options || (options = {});

  var supplier = function(message, callback){

    // we are getting data
    if(message.action=='select'){


    }
  }

  // call this when we are setup
  supplier.ready = function(callback){

    // the RAM supplier is always ready
    callback && callback();
  }

  return supplier;
}

// expose createModule() as the module
exports = module.exports = factory;

