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
var utils = require('../../utils');
var eyes = require('eyes');
var rawFactory = require('./raw');
var supplierFactory = require('../factory');

/*
  Quarry.io - File Supplier
  ------------------------

  Wrapper to a raw supplier backed by a file (XML/JSON)


 */

var api = module.exports = {
  init:function(options, ready){
    var self = this;

    console.log('-------------------------------------------');
    console.log('init file');
    eyes.inspect(options);

    return;

    this.directory = this.options.directory;
    // the path to the data file
    this.path = this.options.path;
    this.format = this.options.format || 'json';
    
    // load the data in the file
    this.load_file(function(error, data){
      if(error){
        ready(error);
        return;
      }

      // create a raw supplier out of the data
      supplierFactory({
        driver:'ram.raw',
        data:data,
        create_ids:true
      }, function(error, rawsupplier){
        if(error){
          ready(error);
          return;
        }
        self.rawsupplier = rawsupplier;

        rawsupplier.after = function(req, res){
          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('after in file supplier');
        }

        ready(null, self);
      })
    })
  },

  file_path:function(){
    return this.directory + this.path + '.' + this.format;
  },

  load_file:function(ready){
    var self = this;
    fs.readFile(this.file_path(), 'utf8', function(error, data){
      if(error || !data){
        data = [];
      }

      ready(null, data);
    })
  },

  save_file:function(ready){
    var self = this;
    var root_container = self.rawsupplier.cache.root;

    var data_string = '';
    if(self.format.match(/\.xml$/)){
      data_string = root_container.toXML();
    }
    else{
      data_string = JSON.stringify(root_container.toJSON());
    }

    fs.writeFile(self.file_path(), data_string, 'utf8', function(error){
      if(error){
        throw new Error(error);
      }

      ready && ready();
    })
  }
}