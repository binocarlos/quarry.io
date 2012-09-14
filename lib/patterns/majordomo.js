/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

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

/*
  Module dependencies.
*/

var _ = require('underscore'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    zmq = require('zmq');

function Majordomo(options)
{
  var requests = zmq.socket('router');
  var requests.identity = 'majordomo:incoming:' + process.pid;
  var responders = zmq.socket('dealer');
  var responders.identity = 'majordomo:outgoing:' + process.pid;
  if (options)
    this.configure(options);
}

Majordomo.prototype.configure = function(options)
{
  var self = this;
  this.config = options;

  this.requests.on('message', function()
  {
    var argl = arguments.length,
      envelopes = Array.prototype.slice.call(arguments, 0, argl - 1),
      payload = arguments[argl - 1];

    console.log('incoming request: ' + payload.toString('utf8'));
    self.responders.send([envelopes, payload]);
  });

  this.requests.bind(options['router'], function(err)
  {
    if (err) console.log(err);
    console.log("router on "+options['router']);
  });

  this.responders.on('message', function()
  {
    var argl = arguments.length,
      envelopes = Array.prototype.slice.call(arguments, 0, argl - 1),
      payload = arguments[argl - 1];

    console.log('incoming response: ' + payload.toString('utf8'));
    self.requests.send([envelopes, payload]);
  });

  this.responders.bind(options['dealer'], function(err)
  {
    if (err) console.log(err);
    console.log("dealer on "+options['dealer']);
  });
}

/*
var majordomo = new Majordomo();
majordomo.configure({ 
  router: 'tcp://127.0.0.1:3009', 
  dealer: 'tcp://127.0.0.1:3010'
});
*/

/*
  MajorDomo is a RPC stack that gives you service names mapped onto other parts of the stack

  This is often used as the central RPC router in a stack

 */

function factory(options){

  options = options || {};

  majordomo = new Majordomo();

  majordomo.configure(options);

  return majordomo;

  /*
  majordomo.configure({ 
    router: 'tcp://127.0.0.1:3009', 
    dealer: 'tcp://127.0.0.1:3010'
  });
  */

/*
  var requests = zmq.socket('router');
  var requests.identity = 'majordomo:incoming:' + process.pid;
  var responders = zmq.socket('dealer');
  var responders.identity = 'majordomo:outgoing:' + process.pid;
*/

}

exports = module.exports = factory;
