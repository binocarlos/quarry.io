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
var url = require('url');

/*

  quarry.io - api middleware

  the HTTP to quarry protocol bridge
  
*/


module.exports = function(options, network){

  options || (options = {});

  _.each(['route', 'warehouse'], function(prop){
    if(!options[prop]){
      throw new Error('api middleware requires ' + prop + ' in the options');
    }
  })

  var httproute = options.route;
  var warehouseroute = options.warehouse;
  var receptionfront = network.receptionfront;
  var warehouse = receptionfront.connect(warehouseroute);
  
  return function(req, res, next){
    var contract = warehouse.api({
      query:req.query,
      url:req.path,
      method:req.method.toLowerCase(),
      headers:_.extend({}, req.headers, {
        "x-json-quarry-user":req.user
      })
    })
    .debug(function(message){
      console.log(JSON.stringify(message, null, 4));
    })
    .expect('array')
    .title('REST request')
    .ship(function(answer, quarryres){
      quarryres.httpsend(res, _.isFunction(answer) ? answer.toJSON() : answer);
    })
  }
}