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
    containerFactory = require('../container'),
    ramSupplier = require('./ram'),
    async = require('async');
    
/*
  Quarry.io JSON File Supplier
  -------------------

  A supplier that points to a JSON file on disk (or somewhere)

  It loads the json into memory and then performs the selection in-memory

  This ALWAYS uses inner-process network for contract resolving (as it uses the RAM supplier)

  options
  -------

  {
    file:__dirname + '/test.json'
  }

 */



function factory(options){

  options || (options = {});

  if(!options.file){
    throw new Error('json_file supplier requires a file')
  }

  // the buffer of incomings messages/callbacks (allows us to throttle)
  var buffer = [];
  
  // the top level container we will search
  var root_container = null;

  // call when ready
  var user_ready_function = null;

  var supplier = function(message, callback){

    // we are getting data
    if(message.action=='select'){

    }
  }

  // call this when we are setup
  supplier.ready = function(callback){

    // assign the callback when we are ready
    callback && (user_ready_function = callback);
    
    return this;
  }

  // lets load the json data
  // very tolerant at the moment - when we get admin logging we can
  // check for errors
  fs.readFile(options.file, 'utf8', function(error, content){
    var raw_data = [];
    if(error || !content){

    }
    else{
      try{
        raw_data = JSON.parse(content);
      }
      catch(e){
        raw_data = [];
      }
    }

    root_container = containerFactory(raw_data);

    supplier.root = root_container;
    supplier.raw = raw_data;

    user_ready_function && user_ready_function(supplier);
  })

  return supplier;
}

// expose createModule() as the module
exports = module.exports = factory;

