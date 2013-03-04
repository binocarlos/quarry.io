/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var utils = require('../../../utils');
var util = require('util');
var deck = require('deck');
var EventEmitter = require('events').EventEmitter;
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - Mesh Multiplex
  --------------------------


  a collection of sockets to be treated like a single socket

  you give it a mesh observer - when the mesh emits an add,
  the multiplex will do the same and the job of building whatever
  device is up to the parent

  once you want to use a socket, you call:

    current()
    or
    any()

  and it will return one or all of them


 */


function factory(options){

  var devicetype = options.type;

  var multiplex = {
    current:null,
    devices:{},
    one:function(){
      return this.current;
    },
    all:function(){
      return _.values(this.devices);
    },
    add:function(id, options){
      var device = Device(devicetype, options);
      device.id = id;
      this.devices[device.id] = device;
      this.allocate();
      this.emit('add', device);
    },
    delete:function(id){
      delete(this.devices[id]);
      this.allocate();
      this.emit('delete', device);
    },
    allocate:function(){
      if(this.current==null){
        this.current = this.randomdevice();
      }
    },
    randomdevice:function(){
      return deck.pick(_.values(multiplex.devices));
    },
    bind:_.bind(observer.bind, observer)
  }

  _.extend(multiplex, EventEmitter.prototype);

  return multiplex;
}