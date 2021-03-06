/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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