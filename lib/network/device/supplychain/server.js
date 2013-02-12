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
var log = require('logule').init(module, 'Supply Chain Server');
var Warehouse = require('../../../warehouse');
var SwitchboardClient = require('../switchboard/client');
var Contract = require('../../../contract');

module.exports = SupplyChainServer;
/*

   the main RPC handler
  
*/
function SupplyChainServer(options){
  EventEmitter.call(this);
  var self = this;
  this.options = options || {};

  var switchboard = this.options.switchboard;
  var stackpath = this.options.stackpath;
  var stackid = this.options.stackid;

  function handle(packet, callback){

    var req = Contract.request(packet);
    var res = Contract.response(function(){
      callback(res.toJSON());
    })
    /*
            
       this is the initial spark for a request entering this supplychain
      
    */
    function bootstrap_request(bootstrapreq){
      /*
    
        when a request ends up server side we stamp it with the stackpath
        which a supplier can then use to stamp containers with the route

        this is used by handlers to know where on the stack we are being invoked from
        
      */
      if(!bootstrapreq.getHeader('x-quarry-supplier')){
        bootstrapreq.setHeader('x-quarry-supplier', stackpath);
      }

      if(!bootstrapreq.getHeader('x-quarry-stack')){
        bootstrapreq.setHeader('x-quarry-stack', stackid);
      }
      
      /*
      
        setup the switchboard onto requests so we can do server side
        portal broadcasts
        
      */
      if(!bootstrapreq.switchboard){
        bootstrapreq.switchboard = switchboard;
      }
      
      /*
      
        hookup the bootstrap feature for sub-requests
        
      */
      bootstrapreq.on('bootstrap', bootstrap_request);
    }

    bootstrap_request(req);

    self.emit('request', req, res, function(){
      res.send404();
    })
  }

  this.handle = handle;
}

util.inherits(SupplyChainServer, EventEmitter);

