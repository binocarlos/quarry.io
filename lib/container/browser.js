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
var EventEmitter = require('events').EventEmitter;
var Container = require('../container');
var Contract = require('../contract');
var utils = require('../utils');

module.exports = bootstrap;

function bootstrap(config){
  /*

    this is injected before the core script - it lets us configure what is happening
    
  */
  var containerconfig = _.defaults(config || {}, {
    protocol:'http://',
    hostname:'localhost',
    stackpath:'/',
    socketid:'quarrywarehousesocket'
  })

  /*

    inject socket.io onto the page
    
  */
  var socketscript = [containerconfig.protocol, containerconfig.hostname, "/socket.io/socket.io.js"].join('');
  document.write('<scr', 'ipt type="text/javascript" src="', socketscript, '"></scr', 'ipt>');

  /*

    connect up the socket
    
  */
  var socket = io.connect([containerconfig.protocol, containerconfig.hostname, '/', containerconfig.socketid);

  socket.on('connect', function(){
    console.log('-------------------------------------------');
    console.log('SOCKET CONNECTION!!!');
  })

  var subscriptions = {};

  var switchboard = {
    listen:function(routing_key, fn){

      if(!fn){
        fn = routing_key;
        routing_key = '*';
      }

      console.dir('portal listen : ' + routing_key);

      var subscriptionid = utils.littleid();

      socket.send('subscription', routing_key);

      subscriptions[subscriptionid] = {
        fn:fn,
        routing_key:routing_key
      }

      return this;
    },
    cancel:function(routing_key, fn){

      console.dir('portal cancel : ' + routing_key);

      var matchingsubscriptions = _.filter(subscriptions, function(subscription){
        return subscription.routing_key==routing_key;
      })

      var totalroutes = matchingsubscriptions.length;

      if(fn){
        matchingsubscriptions = _.filter(matchingsubscriptions, function(subscription){
          return subscription.fn==fn;
        })
      }

      _.each(matchingsubscriptions, function(matchingsubscription){
        delete(subscriptions[matchingsubscription.id]);
      })

      if(totalroutes.length-matchingsubscriptions.length<=0){
        socket.send('cancelsubscription', routing_key);
      }
    },
    broadcast:function(routing_key, packet){

      console.dir('portal broadcast : ' + routing_key);

      socket.send('broadcast', {
        routing_key:routing_key,
        packet:packet
      })
    }
  }

  _.extend(switchboard, EventEmitter.prototype);

  /*

    this is the browser warehouse supply chain setup
    
  */
  var container = Container.new({
    meta:{
      quarrysupplier:containerconfig.stackpath,
      supplychainroot:true
    }
  })

  function supplychain(req, res, next){

    console.dir('supplychain send: ' + req.summary());

    socket.send('request', req.toJSON(), function(error, response){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('response');
      console.dir(error);
      console.dir(response);
    })

  }

  /*

    merge the switchboard into the supplychain and provide it
    to the container
    
  */
  supplychain.switchboard = switchboard;
  container.supplychain = supplychain;

  /*

    a recursive connection so we can dig down the tree in the form of clients
    
  */
  container.connect = function(submountpath, callback){
    var fullpath = [containerconfig.stackpath, submountpath].join('/').replace(/\/\//g, '/');

    return self.connect(fullpath);
  }
}