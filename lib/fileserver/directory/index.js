/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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