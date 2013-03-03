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