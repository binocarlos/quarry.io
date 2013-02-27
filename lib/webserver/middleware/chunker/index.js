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
var eyes = require('eyes');
var express = require('express');
var fs = require('fs');
var log = require('logule').init(module, 'Chunker Middleware');
var dye = require('dye');
var url = require('url');
var ThreadServer = require('../../../threadserver/server');

/*

  quarry.io - chunker middleware

  processes any HTML files for quarry tags that might be processed
  by a script server
  
*/


module.exports = function(middlewareoptions, system){

  var supplychain = system.supplychain;
  var switchboard = system.switchboard;

  var worker = system.worker;
  var codefolder = worker.stack.codefolder;

  var server = new ThreadServer({
    supplychain:supplychain,
    codefolder:codefolder
  })

  var extensions = middlewareoptions.extensions;
  var document_root = middlewareoptions.document_root;

  return function(req, res, next){

    var pathname = url.parse(req.url).pathname;
    if(!pathname.match(/\.\w+$/)){
      pathname += 'index.html';
    }

    var ext = pathname.split('.').pop();

    if(!extensions[ext]){
      next();
      return;
    }

    var filepath = document_root + pathname;

    fs.readFile(filepath, 'utf8', function(error, content){
      if(error || !content){
        next();
        return;
      }

      console.log('-------------------------------------------');
      console.log(content);
      next();
    })
  }
  
}