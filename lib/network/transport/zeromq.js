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
var zmq = require('zmq');

module.exports = factory;

/*

  if there is no work then node.js dumps out

  prevent this with a nothing repeat
  
*/
setInterval(function(){
  
}, 60000)

var closing = false;

/*
  Quarry.io - Transport
  ---------------------

  produces different flavours of network connection

  the message content remains a string (the supply chain will turn it
  into a req, res etc)

  the service registry is consulted for addresses

 */

function factory(type){

  var socket = zmq.socket(type);

  /*
  
    make sure the socket goes when we close the process
    
  */
  process.on('SIGINT', function() {

    try{
      socket.close();
    }catch(e){
      
    }
    

    if(!closing){
      closing = true;
      setTimeout(function(){
        process.exit();
      }, 100)
    }

  })

  return socket;
}
