/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

var eyes = require('eyes');
var transport = require('./transport/zeromq');
var utils = require('../utils');

/**
 * Module dependencies.
 */

module.exports = function(type, config, callback){

  config || (config = {});

  if(!type){
    throw new Error('Device requires type in config');
  }

  var DeviceClass = require('./device/' + type.replace(/\./g, '/'));

  if(DeviceClass.closure==true){
    if(DeviceClass.async==false || !callback){
      return DeviceClass(config);
    }
    else{
      return DeviceClass(config, callback);
    }
  }
  else{
    return new DeviceClass(config);  
  }
}

module.exports.socket = function(type){
  var socket = transport(type);
  socket.identity = type + ':' + utils.littleid();
  return socket;
}