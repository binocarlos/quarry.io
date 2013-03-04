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


var utils = require('../../../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var Warehouse = require('../../../warehouse');
var quarrydb = require('../../quarrydb');

/*

  Quarry.io - Drone Server
  -----------------------------

  runs stacks in low footprint mode for testing
  (one process and minimal port usage)
  
*/

module.exports = function(options){

  var database = quarrydb(options);

  var supplier = Warehouse();

  /*
  
    we are adding some
    
  */
  supplier.post(function(req, res, next){
    res.on('send', function(){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('posted to Drone server');
      eyes.inspect(res.toJSON());
    })
    next();
  })

  supplier.use(database);

  return supplier;
}
