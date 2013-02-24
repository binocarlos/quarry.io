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

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var util = require('util');
var utils = require('../../../utils');
var EventEmitter = require('events').EventEmitter;
var dye = require('dye');
var log = require('logule').init(module, 'Reception Server');
var Warehouse = require('../../../warehouse');
var Contract = require('../../../contract');
var Device = require('../../device');

var HoldingBay = require('./holdingbay');
var Router = require('./router');

module.exports = ReceptionServer;

/*
  Quarry.io - SupplyChain Server
  ------------------------------

  A JSON server that hooks into a warehouse
  and connects a switchboard client

  

 */

function ReceptionServer(options){
  var self = this;
  EventEmitter.call(this);

  log.info('creating reception server');

  this.switchboard = options.switchboard;

  if(!this.switchboard){
    throw new Error('Reception Server requires a switchboard');
  }

  /*
  
    a map of the callback functions for responses
    from the back socket to map into the holdingbay
    
  */
  this.callbacks = {};

  this.front = Device.socket('router');
  this.front.identity = options.socketid + ':front';
  

  this.back = Device.socket('router');
  this.back.identity = options.socketid + ':back';
  

  this.router = Router();

  this.holdingbay = HoldingBay({
    switchboard:this.switchboard
  })

  /*
  
    send the answer back down the front socket
    
  */
  this.front.on('message', _.bind(this.handlefront, this));

  this.holdingbay.on('dispatch:front', function(frames){

    self.front.send(frames);
    
  })

  /*
  
    send a request back down the api socket
    
  */
  this.back.on('message', _.bind(this.handleback, this));

  this.holdingbay.on('dispatch:back', function(department, stackpath, frames){

    var socketid = self.router.rpc(department, stackpath);

    if(!socketid){
      throw new Error('no socket found: ' + department + ':' + stackpath);
    }
    
    /*
    
      use the router to get these frames to the correct socket
      
    */
    frames.unshift(socketid);

    self.back.send(frames);
  })
}

util.inherits(ReceptionServer, EventEmitter);

ReceptionServer.prototype.bind = function(front, back){

  log.info(dye.red('binding') + ' Reception Server');

  log.info(dye.red('binding') + ' FRONT: ' + dye.red(front) + ' - ' + dye.yellow(this.front.identity));
  this.front.bindSync(front);
  log.info(dye.red('binding') + ' BACK: ' + dye.red(back) + ' - ' + dye.yellow(this.back.identity));
  this.back.bindSync(back);
  
  return this;
}

ReceptionServer.prototype.handlefront = function(){
  this.holdingbay.handlefront(_.toArray(arguments));  
}

ReceptionServer.prototype.handleback = function(){
  var self = this;
  
  if(arguments[1].toString()=='heartbeat'){
    this.router.heartbeat(arguments[0].toString(), JSON.parse(arguments[2].toString()));    
  }
  else{
    this.holdingbay.handleback(_.toArray(arguments));  
  }
}