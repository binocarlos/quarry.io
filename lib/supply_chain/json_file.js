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

// expose createModule() as the module
exports = module.exports = factory;

// the messages after which we commit to disk
var save_after_actions = {
  append:true,
  save:true
}

function factory(options, ready_callback){

  options || (options = {});

  if(!options.file){
    throw new Error('json_file supplier requires a file')
  }

  // the top level container we will search
  var ram_supply_chain = null;

  // has the data loaded yet?
  var ready = false;
  var user_ready_functions = ready_callback ? [ready_callback] : [];

  load_data(options.file, function(error, file_data){
    ram_supply_chain = ramSupplier({
      data:file_data
    })
    trigger_ready();
  })

  // a wrapper for a RAM supplier that triggers a save on some actions
  var chain = function(req, callback){

    // pass the message off to the RAM supplier
    ram_supply_chain(req, function(error, res){

      // check if the action requires us to save the JSON file
      if(save_after_actions[req.action]){

        // make sure we filter out the 'data'
        var json_data = ram_supply_chain.raw(function(data){
          delete(data._data);
          return data;
        })
        
        save_data(options.file, json_data, function(){
          callback && callback(error, res);
        });

      }
      else{
        callback && callback(error, res)
      }

    })
   
  }

  chain.options = options;

  /*
    Register a callback when the file is loaded
   */
  chain.ready = function(callback){
    if(ready){
      callback && callback();
    }
    else{
      user_ready_functions.push(callback);
    }
    return this;
  }

  /*
    Run once the file is loaded
   */
  function trigger_ready(){
    ready = true;
    _.each(user_ready_functions, function(user_ready_function){
      user_ready_function.apply(chain, [chain]);
    })
    user_ready_functions = [];
  }

  /*
    Load the raw JSON string
   */
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

  /*
    Save the raw JSON string
   */
  function save_data(file, data, callback){
    var json_string = options.pretty ? JSON.stringify(data, null, 4) : JSON.stringify(data);

    fs.writeFile(file, json_string, 'utf8', callback);
  }

  return chain;
}


