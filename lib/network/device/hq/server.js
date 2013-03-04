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
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var Warehouse = require('../../../warehouse');
var Supplier = require('../../../supplier')
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - HQ Server
  ------------------------------

  A mesh 

 */

function factory(options){

  function get_switchboard_options(direction){
    return {
      name:options.name,
      stackid:options.stackid,
      pub:{
        type:'pub',
        direction:direction,
        address:options.endpoints.pub
      },
      sub:{
        type:'sub',
        direction:direction,
        address:options.endpoints.sub
      }
    }
  }

  var switchboardserver = Device('switchboard.server', get_switchboard_options('bind'));
  var switchboardclient = Device('switchboard.client', get_switchboard_options('connect'));
  var hq = Device('supplychain.server', {
    switchboard:switchboardclient,
    socket:{
      type:'router',
      direction:'bind',
      address:options.endpoints.socket
    }
  })

  hq.warehouse.use(Supplier('quarry.quarrydb', {
    collection:'quarry.system',
    reset:true
  }))
  
  return hq;
}