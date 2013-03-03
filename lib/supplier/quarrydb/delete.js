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

var tools = require('./tools');
var eyes = require('eyes');
var ensure_skeleton = require('./ensure_skeleton');

var log = require('logule').init(module, 'QuarryDB Supplier: delete');

/*
  Quarry.io Quarrydb -> delete
  ----------------------------------

  delete container data

  options
  -------

  {
    
  }

 */

var del = module.exports = function(mongoclient){

  return function(req, res, next){

    log.info('running delete request');
    
    ensure_skeleton(mongoclient, req, res, function(){
      var skeleton = req.getHeader('x-json-skeleton')[0];

      tools.del(mongoclient, skeleton[0], function(error){
        if(error){
          res.error(error)
        }
        else{
          
          res.send(skeleton[0]);
        }
      })
    })
    
  
  }
}