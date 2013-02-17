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
var deck = require('deck');
var log = require('logule').init(module, 'Switchboard');
var Device = require('../../device');
var SparkMonitor = require('../node/sparkmonitor');
var dye = require('dye');

module.exports = factory;
module.exports.closure = true;
/*

  quarry.io - multi switchboard client
  
  listens to the system and hooks up to multiple switchboards

  it only ever uses one at a time
  
*/

function factory(options, callback){

  var self = this;

  options || (options = {});

  var db = options.db;

  var mainspark = null;

  var sparks = {};

  var switchboard = Device('switchboard.client');

  var assigned = false;

  function assign(){

    if(mainspark!=null){
      return;
    }

    var spark = deck.pick(_.values(sparks));
    var endpoints = spark.attr('endpoints');

    var pub = Device.socket('pub');
    var sub = Device.socket('sub');

    log.info(dye.magenta('connecting') + ' PUB: ' + dye.magenta(spark.attr('endpoints').sub));
    pub.connect(spark.attr('endpoints').sub);

    log.info(dye.magenta('connecting') + ' SUB: ' + dye.magenta(spark.attr('endpoints').pub));
    sub.connect(spark.attr('endpoints').pub);
  
    switchboard.hotswap(pub, sub);

    mainspark = spark;

    if(!assigned){
      assigned = true;
      setTimeout(function(){
        callback(null, switchboard);  
      }, 50)
    }
  }

  var monitor = SparkMonitor({
    db:db,
    selector:'group#workers.switchboard'
  })

  monitor.on('add', function(spark){

    sparks[spark.quarryid()] = spark;
    assign();
    
  })

  monitor.on('remove', function(spark){
    
    delete(sparks[spark.quarryid()]);

    if(mainspark && spark.quarryid()==mainspark.quarryid()){
      mainspark = null;
      reassign();
    }

  })

  monitor.start(function(){
    
  })
}