/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var async = require('async');
var watch = require('watch');
var fs = require('fs');

/*

  quarry.io - file watcher

  Keeps one directory in sync with another

  use to keep the development stack updated with hot code changes

  
*/

module.exports = FileWatcher;

function FileWatcher(source, destination){
  EventEmitter.call(this);
  this.source = source;
  this.destination = destination;
  this.initialize();
}

util.inherits(FileWatcher, EventEmitter);

FileWatcher.prototype.initialize = function(){
  var self = this;
  return;
  watch.createMonitor(this.source, {
    ignoreDotFiles:true
  }, function (monitor) {
    //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
    monitor.on("created", function (f, stat) {
      var dest = self.destination + f.substr(self.source.length);
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('monitor create: ' + f + ' -> ' + dest);
      self.copyfile(f, dest);
    })
    monitor.on("changed", function (f, stat) {
      var dest = self.destination + f.substr(self.source.length);
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('monitor copy: ' + f + ' -> ' + dest);
      self.copyfile(f, dest);
    })
    
  })
}

FileWatcher.prototype.copyfile = function(from, to){
  fs.createReadStream(from).pipe(fs.createWriteStream(to));
}