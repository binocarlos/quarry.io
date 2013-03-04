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
var deck = require('deck');
var Device = require('../../device');
var SparkMonitor = require('../node/sparkmonitor');

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

    pub.connect(spark.attr('endpoints').sub);
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
    selector:'workers.switchboard'
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