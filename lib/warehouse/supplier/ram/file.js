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

var _ = require('underscore');
var async = require('async');
var utils = require('../../../utils');
var eyes = require('eyes');
var rawFactory = require('./raw');
var Warehouse = require('../../../warehouse');
var fs = require('fs');

/*
  Quarry.io - RAM Supplier
  ------------------------

  Holds containers in memory and performs actions


 */

var api = {};

function factory(options){
  options || (options = {});

  _.defaults(options, {
    format:'xml'
  })

  // the path to the data file
  var path = options.path;

  function save_file(rawsupplier, callback){
    var root_container = rawsupplier.cache.root;

    var data_string = '';
    if(path.match(/\.xml$/)){
      data_string = root_container.toXML();
    }
    else if(path.match(/\.json$/)){
      data_string = JSON.stringify(root_container.toJSON());
    }

    fs.writeFile(options.path, data_string, 'utf8', function(error){
      if(error){
        throw new Error(error);
      }

      callback && callback();
    })
  }

  var warehouse = new Warehouse();
  
  warehouse.prepare(function(ready){
    fs.readFile(options.path, 'utf8', function(error, data){
      if(error || !data){
        data = [];
      }

      var rawsupplier = rawFactory({
        data:data,
        create_ids:true
      })

      warehouse.use(rawsupplier);

      rawsupplier.on('change', function(){

        save_file(rawsupplier);

      })

      save_file(rawsupplier, function(){
        ready && ready();
      })

    })
  })
  
  return warehouse;
}

exports = module.exports = factory;