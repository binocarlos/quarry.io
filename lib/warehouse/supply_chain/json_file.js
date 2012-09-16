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
    ramSupplier = require('./ram'),
    containerFactory = require('../container'),
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

// the messages after which we commit to disk
var save_after_messages = {
  append:true,
  save:true
}



function factory(options){

  options || (options = {});

  if(!options.file){
    throw new Error('json_file supplier requires a file')
  }

  // the buffer of incomings messages/callbacks (allows us to throttle)
  var buffer = [];
  
  // the top level container we will search
  var ram_supply_chain = null;

  // has the data loaded yet?
  var ready = null;

  load_data(options.file, function(error, file_data){
    ram_supply_chain = ramSupplier({
      data:file_data
    })
    ready = true;
    clear_buffer();
  })

  function clear_buffer(){
    _.each(buffer, function(buffer_entry){
      request(buffer_entry.message, buffer_entry.callback);
    })

    buffer = [];
  }

  function request(req, callback){ 

    ram_supply_chain(req, function(error, res){

      if(error){
        callback(error);
        return;
      }

      if(save_after_messages[req.action]){

        save_data(options.file, ram_supply_chain.raw(), function(){
          callback && callback(error, res);
        });

      }
      else{
        callback && callback(error, res)
      }

    })
  }

  function load_data(file, callback){
    // lets load the json data
    // very tolerant at the moment - when we get admin logging we can
    // check for errors
    fs.readFile(file, 'utf8', function(error, content){
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

      // now lets process for ids and such forth
      var root_container = containerFactory(raw_data);

      // we want this so raw data has an id inserted if needed
      root_container.recurse(function(container){

      })

      var raw_data = _.map(root_container.children(), function(child){
        return child.raw();
      })

      save_data(file, raw_data, function(){
        callback(error, raw_data);  
      })

    })
  }

  function save_data(file, data, callback){
    var json_string = options.pretty ? JSON.stringify(data, null, 4) : JSON.stringify(data);

    fs.writeFile(file, json_string, 'utf8', callback);
  }

  var chain = function(message, callback){

    buffer.push({
      message:message,
      callback:callback
    })

    // if we are not ready then stack the message and callback
    if(ready){
      
      clear_buffer();
    }
   
  }

  return chain;
}

// expose createModule() as the module
exports = module.exports = factory;

