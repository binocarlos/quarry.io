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
var EventEmitter = require('events').EventEmitter;

/*

  quarry.io - thread server

  exports the core container api for the thread servers


 */

module.exports = function(factory){

  return function(containerconfig){

    var readycount = 0;
    var readynames = {};
    var readycallbacks = [];
    var triggeredready = false;

    var readyBound = false;

    function announceready(type){

      if(triggeredready){
        return;
      }

      if(readynames[type]){
        return;
      }

      readycount++;
      readynames[type] = true;
      if(readycount>=2){
        _.each(readycallbacks, function(fn){
          fn();
        })
        readycallbacks = [];
        triggeredready = true;
      }
    }

    function bindReady(){
      if ( readyBound ) return;
      readyBound = true;

      // Mozilla, Opera and webkit nightlies currently support this event
      if ( document.addEventListener ) {
        // Use the handy event callback
        document.addEventListener( "DOMContentLoaded", function(){
          document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
          announceready('document');
        }, false );

      // If IE event model is used
      } else if ( document.attachEvent ) {
        // ensure firing before onload,
        // maybe late but safe also for iframes
        document.attachEvent("onreadystatechange", function(){
          if ( document.readyState === "complete" ) {
            document.detachEvent( "onreadystatechange", arguments.callee );
            announceready('document');
          }
        });

        // If IE and not an iframe
        // continually check to see if the document is ready
        if ( document.documentElement.doScroll && window == window.top ) (function(){
          if ( triggeredready ) return;

          try {
            // If IE is used, use the trick by Diego Perini
            // http://javascript.nwbox.com/IEContentLoaded/
            document.documentElement.doScroll("left");
          } catch( error ) {
            setTimeout( arguments.callee, 0 );
            return;
          }

          // and execute any waiting functions
          announceready('document');
        })();
      }
    }

    /*

      connect up the socket
      
    */
    var socket = null;//io.connect([containerconfig.protocol, containerconfig.hostname, '/', containerconfig.socketid].join(''));

    var switchboard = {
      listen:function(routing_key, fn){
        return this;
      },
      cancel:function(routing_key, fn){
        return this;
      },
      broadcast:function(routing_key, packet){
        return this;
      }
    }

    _.extend(switchboard, EventEmitter.prototype);

    function supplychain(req, res, next){

      socket.emit('request', req.toJSON(), function(response){
        res.update(response);
        res.send();
      })

    }

    supplychain.switchboard = switchboard;

    /*

      this is the browser warehouse supply chain setup
      
    */

    function getcontainer(appendpath){

      if(arguments.length>0){
        appendpath = appendpath.indexOf('/')==0 ? appendpath : '/' + appendpath;
      }
      else{
        appendpath = null;
      }

      var containerdata = _.map(_.map(containerconfig.stackpaths, function(stackpath){
        return appendpath ? stackpath + appendpath : stackpath;
      }), function(stackpath){
        return {
          meta:{
            quarrysupplier:stackpath,
            supplychainroot:true
          }
        }
      })

      var retcontainer = factory(containerdata);
      /*

        merge the switchboard into the supplychain and provide it
        to the container
        
      */
      
      retcontainer.supplychain = supplychain;

      /*

        a recursive connection so we can dig down the tree in the form of clients
        
      */
      retcontainer.connect = function(submountpath, callback){
        var newcontainer = getcontainer(submountpath);
        callback && callback(newcontainer);
        return newcontainer;
      }

      return retcontainer;
    }

    

    var container = getcontainer();

    function $quarry(fn){

      if(triggeredready){
        fn && fn(container);
        return this;
      }
      else{
        readycallbacks.push(function(){
          fn && fn(container);
        })
        return this;
      }
    }

    $quarry.ready = $quarry;
    $quarry.new = factory;

    bindReady();

    return $quarry;
  }
}