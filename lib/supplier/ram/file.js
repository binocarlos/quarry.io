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
var wrench = require('wrench');
var fs = require('fs');
var raw_supplier = require('./raw');

/*
  Quarry.io - File Supplier
  ------------------------

  Wrapper to a raw supplier backed by a file (XML/JSON)


 */

var api = module.exports = raw_supplier.extend({

  prepare:function(ready){
    var self = this;

    var network = this.get('network');
    var localfiles = network.localfiles();
    this.directory = localfiles + this.get('directory');
    // the path to the data file
    this.file = this.get('path');
    this.format = this.get('format') || 'json';
    this.pretty = this.get('pretty') || false;

    // load the data in the file
    this.load_file(function(error, data){
      if(error){
        ready(error);
        return;
      }

      self.create_cache(data);

      ready && ready(null, self);
    })
  },

  _after:function(req, res){
    if(req.method()=='get'){
      return;
    }
    // save here
    this.save_file();
  },

  file_path:function(){
    return this.directory + '/' + this.file + '.' + this.format;
  },

  load_file:function(ready){
    var self = this;
    if(!this.file){
      ready('no file');
      return;
    }
    fs.readFile(this.file_path(), 'utf8', function(error, data){
      if(error || !data){
        data = [];
      }

      ready(null, data);
    })
  },

  save_file:function(){

    var self = this;
    if(self._writing){
      return;
    }
    
    var root_container = self.cache.root;

    var data_string = '';
    if(self.format=='xml'){
      data_string = root_container.toXML();
    }
    else{
      data_string = this.pretty ? JSON.stringify(root_container.toJSON(), null, 4) : JSON.stringify(root_container.toJSON());
    }

    self._writing = true;

    fs.writeFile(self.file_path(), data_string, 'utf8', function(error){
      if(error){
        throw new Error(error);
      }

      self._writing = false;
    })
  }
})