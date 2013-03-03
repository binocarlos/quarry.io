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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var eyes = require('eyes');
var _ = require('lodash');
var async = require('async');
var Node = require('./proto');
var Device = require('../device');

var Server = require('../../webserver');

/*

  quarry.io - web node

  virtual host for web servers
  
*/

module.exports.configure = function(nodecontainer, callback){

}

module.exports.run = function(spark, system, trim, callback){

  /*
  
    make the system for the middleware to use
    
  */
  var system = {
    id:worker.stackid,
    supplychain:trim.supplychain,
    httpproxy:trim.socket.http,
    switchboard:trim.switchboard,
    cache:trim.cache,
    endpoint:spark.attr('endpoints').http,
    //codepath:_.bind(system.config.attr('codepath'), self),
    //worker:worker        
  }

  //var server = Server(self.node, system);
    
    /*
    
      pass the system into each website for it's middleware
      
    */
    //self.server.load_websites(next);

    //self.server.bind(next);


  callback();
  
}