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
var async = require('async');
var utils = require('./utils');
var Backbone = require('./vendor/backbone');
var eyes = require('eyes');

module.exports = Stack;

/*
  Quarry.io - Stack
  -----------------

  Represents one hostname on a quarry network

  Each stack will be booted

  The nature of the stack defined how it's booted

  A process stack lives all in one process - it uses plain functions as supply chains

  A server stack lives all on one server - it uses ZeroMQ localhost as supply chains

  A network stack lives on several servers - it uses ZeroMQ

  provisioning?


 */

function Stack(options){
  this.initialize(options);
  _.extend(this, Backbone.Events);
}


/*
  identifier
 */
Stack.prototype.is_stack = true;

/*
  The normal default container model
 */
Stack.prototype.initialize = function(options){

  var self = this;

  options || (options = {});

  this.options = options;

  this._hostname = options.hostname || utils.quarryid(true);

}

/*


  READY





 */


Stack.prototype.hostname = function(){
  return arguments.length>0 ? this._route.hostname = arguments[0] : this._route.hostname;
}