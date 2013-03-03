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


/*

  quarry.io - router node

  the front door HTTP router
  
*/

module.exports = Router;

/*

  skeleton network config
  
*/

function Router(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(Router, Node);

Router.prototype.boot = function(callback){

  this.switchboard = null;

  var self = this;
  
  async.series([

    /*
    
      make a clustered switchboard client
      
    */
    function(next){

      self.bootsystem(function(error, db){
        self.db = db;
        next();
      })

    },

    function(next){

      Device('switchboard.multiclient', {
        db:self.db
      }, function(error, client){
        self.switchboard = client;

        next();
      })

    },

    function(next){

      /*
      
        get a connection to the backend reception

        this provides us with requests to process
        
      */
      Device('http.router', {
        port:80,
        db:self.db
      }, function(error, router){

        self.router = router;
        next();
      })
    }

  ], function(){

    
    
    callback();
  })
  
  
}