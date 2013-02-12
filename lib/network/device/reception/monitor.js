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

var log = require('logule').init(module, 'ReceptionMonitor');

/*

  quarry.io - Reception Monitor

  keeps an eye on the system database so we know when new reception
  servers arrive on the network
  
*/

module.exports = ReceptionMonitor;

/*

  skeleton network config
  
*/

function ReceptionMonitor(db){
  EventEmitter.call(this);
  this.db = db;
}

util.inherits(ReceptionMonitor, EventEmitter);

ReceptionMonitor.prototype.boot = function(callback){
  /*
  
    load up the top level worker container

    then grab exiting reception sparks

    then listen for any changes concerning sparks
    
  */
  this.db('group#workers.reception').ship(function(group){

    /*
    
      find the initial reception sparks
      
    */
    group('spark').ship(function(sparks){

      sparks.each(function(spark){
        self.emit('add', spark);
      })


      /*
      
        setup a portal for any changes
        
      */
      group.portal()
        .appended('spark.reception', function(spark){
          self.emit('add', spark);
        })
        .deleted('spark.reception', function(spark){
          self.emit('remove', spark);
        })
    })
  })
}