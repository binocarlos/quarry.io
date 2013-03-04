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
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('../../../utils');
var eyes = require('eyes');
var _ = require('lodash');
var deck = require('deck');
var dye = require('dye');
var request = require('request');

/*

  quarry.io - HTTP Socket Combo

  transparent proxy to a bunch of http endpoints registered by hostname
  
*/

module.exports = factory;
module.exports.closure = true;
module.exports.async = false;

function factory(options){

  options = _.defaults(options || {}, {
    
  })

  var endpoints = {};
  var endpointarray = [];

  var combo = {

    /*
    
      the sockets by their id
      
    */


    add:function(id, endpoint){
      endpoints[id] = endpoint;
      endpointarray = _.values(endpoints);
    },

    remove:function(id){
      delete(endpoints[id]);
      endpointarray = _.values(endpoints);
    },

    /*
    
      we pick the socket we want to send down
      
    */
    proxy:function(path, req, res){

      var endpoint = deck.pick(endpointarray);
      var url = [req.protocol, '://', endpoint.hostname, ':', endpoint.port, path].join('');
      var options = {
        uri:url,
        qs:req.query,
        method:req.method,
        headers:req.headers
      }

      if(req.method.toLowerCase()!='get'){
        options.body = req.body;
      }

      request(options).pipe(res);
        
    }

    
  }

  _.extend(combo, EventEmitter.prototype);

  return combo;
}