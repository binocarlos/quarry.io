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
var NameServer = require('./nameserver');
var log = require('logule').init(module, 'Device');
var eyes = require('eyes');

/*
  Quarry.io - device factory
  ------------------------------

  exposes all of the different devices

  




 */

var nameserver = new NameServer();

var devices = module.exports = {
  rpc:require('./device/rpc'),
  switchboard:require('./device/switchboard'),

  serverfactory:function(key, extraconfig, callback){
  
    if(!callback){
      callback = extraconfig;
      extraconfig = {};
    }
  

    log.info('running device server factory: ' + key);

    nameserver.getdevice(key, function(error, config){

      if(error){
        callback(error);
        return;
      }

      config.bind = true;

      _.extend(config, extraconfig);
      
      var deviceclass = devices[config.type];
      var device = deviceclass.server(config);  
      
      callback(error, device)

    })


  },

  clientfactory:function(key, extraconfig, callback){

    if(!callback){
      callback = extraconfig;
      extraconfig = {};
    }
  
    log.info('running device client factory: ' + key);

    nameserver.getdevice(key, function(error, config){

      if(error){
        callback(error);
        return;
      }

      _.extend(config, extraconfig);

      var deviceclass = devices[config.type];
      var device = deviceclass.client(config);  
      
      callback(error, device)

    })

  }
}