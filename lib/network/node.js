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
/*
var flavours = {
  router:require('./node/router'),
  web:require('./node/web'),
  file:require('./node/file'),
  app:require('./node/app'),
  functional:require('./node/functional'),
  reception:require('./node/reception'),
  switchboard:require('./node/switchboard'),
  api:require('./node/api')
}

module.exports = function(options){
  if(!options){
    throw new Error('test');
  }
  var Proto = flavours[options.flavour];
  return new Proto(options);
}
*/
/*

  things run for each stack
  
*/
module.exports.departments = [
  'web',
  'switchboard',
  'reception',
  'middleware',
  'warehouse',
  'functional',
  'file'
]

/*

  the sockets used for each type
  
*/
module.exports.endpoints = {
  web:{
    http:{
      type:'http'
    }
  },
  reception:{
    http:{
      type:'http'
    },
    front:{
      type:'router'
    },
    back:{
      type:'api'
    }
  },
  file:{
    http:{
      type:'http'
    }
  },
  app:{
    http:{
      type:'http'
    }
  },
  switchboard:{
    pub:{
      type:'pub'
    },
    sub:{
      type:'sub'
    }
  }
}