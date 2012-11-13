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

var _ = require('underscore');
var BackboneDeep = require('../vendor/backbonedeep');
var eyes = require('eyes');
var url = require('url');
var utils = require('../utils');

/*
  Quarry.io - Response
  --------------------

  Much like request but simpler

  

 */



var Response = module.exports = BackboneDeep.extend({
  initialize:function(){
    this.sent = false;
  },

  /*


    Data Methods
    

   */

  contentType:function(val){
    return val ? this.header('Content-Type', val) : this.header('Content-Type');
  },

  header:utils.object_accessor('headers'),
  headers:utils.property_accessor('headers'),

  body:utils.property_accessor('body'),
  status:utils.property_accessor('status'),

  hasError:function(){
    return this.status()==500 || this.status()==404;
  },
  
  /*


    Promise
    

   */

  send:function(content){
    if(this.sent){
      throw new Error('This response has already been sent!')
    }
    this.sent = true;
    this.body(content);
    this.trigger('send');
  }
})