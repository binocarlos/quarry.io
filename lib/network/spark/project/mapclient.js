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

var _ = require('lodash');
var eyes = require('eyes');
var EventEmitter = require('events').EventEmitter;
var Heartbeat = require('../staff/tools/heartbeat');
var Container = require('../../../container');

/*

  quarry.io - mapclient

  connects back to the map container at hq
  to let it know about spark endpoints

  you can either register or listen

  register means emit a maplocation every second

  listen means listen for all locations arriving

  
*/

module.exports = function(options){

  options = _.defaults(options, {
    talkdelay: 1000,
    worrydelay: 3000
  })

  var mapcontainer = options.container;
  var routingradio = mapcontainer.radio();

  if(options.worrydelay<options.talkdelay*3){
    throw new Error('the map client worry delay must be at least 3 times the talk delay');
  }

  var mapclient = {};

  var ischecking = false;

  var connections = {};

  function check(){

    var currentstamp = new Date().getTime();

    _.each(connections, function(department, department_name){
      _.each(department, function(data, id){
        var gap = currentstamp - data.timestamp;

        if(gap>options.worrydelay){
          mapclient.emit('remove', id);
        }
      })
    })
    /*
    
      we keep checking the current connections for stale ones
      
    */
    setTimeout(function(){
      check();

    }, options.talkdelay)
  }

  function start_checking(){
    if(ischecking){
      return;
    }

    check();
  }
  
  mapclient.register = function(department, data){

    var location = Container.new('location', data).addClass(department);

    data.department = department;

    /*
    
      add the location to the map

      hq then looks after it's presence on the map
      by listening into it's radio heartbeat below
      
    */
    mapcontainer
      .append(location)
      .title('Saving location to map: ' + location.summary())
      .ship(function(){

        var heartbeat = Heartbeat({
          delay:1000
        })

        heartbeat.on('beat', function(counter){
          data.timestamp = new Date().getTime();
          routingradio.talk('route.' + department, data);
        })

        /*
        
          start emitting location updates over radio
          
        */
        setTimeout(function(){
          heartbeat.start();  
        }, 200 + (Math.round(Math.random()*1000)))
      })

    return this;
  },

  /*
  
    hook into the mapdepartment - load the locations for a department

    then hook into the radio and listen for statuses
    
  */
  mapclient.listen = function(department){

    start_checking();

    connections[department] || (connections[department] = {});

    var useconnections = connections[department];

    /*
    
      setup the listener that will collect the updates from locations
      
    */
    routingradio.listen('route.' + department, function(message){
      
      if(!useconnections[message.id]){
        mapclient.emit('add', message, department);
      }
      message.timestamp = new Date().getTime();
      useconnections[message.id] = message;
    })
   
    return this; 
  }
  

  _.extend(mapclient, EventEmitter.prototype);

  return mapclient;
}