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

var Node = require('./proto');
var Device = require('../device');

/*

  quarry.io - switchboard node

  the pub/sub server for a stack

  it connects to all the other swithboard servers via a connection
  and listens / publishes like a router
  
*/

module.exports = Switchboard;

/*

  skeleton network config
  
*/

function Switchboard(){
  Node.apply(this, _.toArray(arguments));
}

util.inherits(Switchboard, Node);

/*

  hook up one switchboard server that is listening to the others also
  
*/
Switchboard.prototype.boot = function(callback){

  var self = this;
  var endpoints = this.spark.attr('endpoints');

  self.device = Device('switchboard.server', _.extend({
    pub:Device.socket('pub'),
    sub:Device.socket('sub')
  }, self.spark.attr()))

  Device('node.sparkmonitor', {
    db:this.db,
    selector:'group#workers.switchboard',
    ignore_spark:this.spark.quarryid()
  }, function(error, monitor){
    monitor.on('add', function(spark){
      self.device.addspark(spark);
    })

    monitor.on('remove', function(spark){
      self.device.removespark(spark);
    })

    monitor.start(function(){

      self.device.bind(endpoints.pub, endpoints.sub);

      callback();
    })
  })
}