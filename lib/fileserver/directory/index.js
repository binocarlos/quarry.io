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
var async = require('async');
var utils = require('../../utils');
var eyes = require('eyes');
var wrench = require('wrench');
var fs = require('fs');
var mime = require('mime');
var express = require('express');
var Warehouse = require('../../warehouse');
var buffet = require('buffet');
var path = require('path');
var Chunker = require('../chunker');

module.exports = factory;

/*
  Quarry.io - File Supplier
  ------------------------

  Wrapper to a raw supplier backed by a file (XML/JSON)


 */
function objDataFactory(tagname, filepath){

  var data = {
    meta:{
      tagname:tagname,
      id:filepath,
      classnames:[],
      quarrysupplier:'file:/'
    },
    attr:{
      type:tagname,
      path:filepath
    },
    children:[]
  }

  if(tagname!='folder'){
    var mimeType = mime.lookup(filepath);
    var parts = mimeType.split('/');

    var ext = filepath.split('.').pop();
    data.attr.mime = mimeType;
    data.attr.ext = ext;

    _.each(parts, function(part){
      data.meta.classnames.push(part);
    })

    data.meta.classnames.push('file');
  }
  else{
    data.meta.classnames.push('directory');
    data.meta.classnames.push('folder');
  }

  return data;
}

function factory(options, system){

  var directory = options.location;

  var chunker = Chunker();

  return function(req, res, next){

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    eyes.inspect(req.query);
    var filepath = path.normalize(directory + req.path);

    if(!filepath.match(/\.\w+$/)){
      fs.readdir(filepath, function(error, list){
        var data = _.map(list, function(file){
          return objDataFactory('file', options.route + req.path + file);
        })
        res.json(data);
      })
    }
    else{
      chunker(filepath, req.query, function(error, finalpath){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('answer');
        eyes.inspect(finalpath);

        res.sendfile(finalpath);  
      })
    }
  }
  
}