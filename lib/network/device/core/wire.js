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
var utils = require('../../../utils');

module.exports = factory;

/*

  if there is no work then node.js dumps out

  prevent this with a nothing repeat
  
*/
setInterval(function(){
  
}, 60000)

/*

  make sure the socket goes when we close the process
  
*/
process.on('SIGINT', function() {

  try{
    socket.close();
  }catch(e){
    
  }

  setTimeout(function(){
    process.exit();  
  }, 50)
  
})

var closing = false;

/*
  Quarry.io - Transport
  ---------------------

  returns a function that can produce ZeroMQ sockets configured to behave in a certain way

  options:

    type ( router | dealer | pub | sub )
    direction ( bind | connect )
    address ( 'ipc:/filepath' | 'tcp://x.x.x.x:yyyy' )

 */

var direction_methods = {
  bind:'bindSync',
  connect:'connect'
}

function factory(options){

  var wire = zmq.socket(options.type);
  wire.identity = utils.littleid();

  console.log('-------------------------------------------');
  console.log('wire (' + wire.identity + '): ' + options.type + ' -> ' + options.direction + ' to ' + options.address);

  if(options.direction=='bind'){
    wire.bindSync(options.address);
  }
  else{
    wire.connect(options.address);
  }
  
  return wire;
}
