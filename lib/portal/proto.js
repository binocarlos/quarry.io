/*
  Copyright (c) 2013 All contributors as noted in the AUTHORS file

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


/**
 * Module dependencies.
 */

var log = require('logule').init(module, 'Portal');
var dye = require('dye');
var eyes = require('eyes');
var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var inspectselect = require('inspectselect');
var Router = require('../container/router');
var _ = require('lodash');
var Message = require('./message');

module.exports = Portal;

/*

  quarry.io - portal

  a wrapper representing events broadcast and subsrcibed for
  a container within a stack

  it manages the subscription keys via the routes property of the
  container's meta data

  supplier.portal.method

  
*/

function Portal(){
  EventEmitter.call(this);

  /*
  
    a register a portal routes against callbacks
    
  */
  this.stack = {};
  this.depthmode = false;
}

util.inherits(Portal, EventEmitter);

/*

  attach this portal onto a switchboard client
  
*/
Portal.prototype.attachcontainer = function(container){

  this.router = Router(container.skeleton());

  switchboard && (this.switchboard = switchboard);
}

/*

  attach a skeleton and a switchboard client
  
*/
Portal.prototype.attach = function(skeleton, switchboard){

  this.router = Router(skeleton);

  switchboard && (this.switchboard = switchboard);
}

/*

  a generic method handler (i.e. appended, saved or deleted)
  
*/

Portal.prototype.changed = function(selector, fn){
  var args = _.toArray(arguments);
  args.unshift('*');
  this._registerselector.apply(this, args);
  return this;
}

Portal.prototype.appended = function(selector, fn){

  var args = _.toArray(arguments);
  args.unshift('post');
  this._registerselector.apply(this, args);
  return this;
/*
  var self = this;

  if(!fn){
    fn = selector;
    selector = null;
  }

  if(!this.spawn){
    throw new Error('cannot run added without a spawn function');
  }
  
  return this.containermethod('post', function(message){


    var results = self.spawn(message.body);

    if(selector){
      results = results.find(selector);
    }
    
    results.count()>0 && fn(results);
    
  })
*/
}

Portal.prototype.saved = function(selector, fn){
  var args = _.toArray(arguments);
  args.unshift('put');
  this._registerselector.apply(this, args);
  return this;
}

Portal.prototype.deleted = function(selector, fn){
  var args = _.toArray(arguments);
  args.unshift('delete');
  this._registerselector.apply(this, args);
  return this;
}

Portal.prototype._registerselector = function(httpmethod, selector, fn){

  var self = this;
  if(!fn){
    fn = selector;
    selector = null;
  }

  /*
  
    default deep mode is true because they need to do a

      > thing

    in the selector to indicate direct descendents
    
  */
  var deepmode = true;

  if(selector){
    var parsed = inspectselect(selector);
    selector = parsed[0][0];
    deepmode = selector.splitter!='>';
    delete(selector.splitter);

    /*
    
      check we have a way of making containers without referencing the container back (circular deps)
      
    */
    if(this.spawn){
      var origfn = fn;

      fn = function(message){
        var target = message.target();

        if(target.match(selector)){
          origfn(message);
        }
      }
    }

    
  }

  this._register(deepmode, httpmethod, fn);  
}

/*

  internal method as a proxy onto the actual switchboard
  
*/
Portal.prototype._register = function(mode, method, fn){
  var self = this;

  var usemethod = method && method!='*';

  var routermethod = (mode ? 'deep' : 'shallow') + (usemethod ? 'method' : '');
  var route = self.router[routermethod].apply(self.router, [method]);

  self.listen(route, function(message){
    fn(new Message(message, self.spawn));
  })

  return this;
}

Portal.prototype.run_stack = function(route, message){
  var self = this;
  _.each(this.stack[route], function(fn){
    fn && fn(message);
  })
}

Portal.prototype.listen = function(route, fn){
  var self = this;
  if(this.switchboard){
    if(!this.stack[route]){
      this.stack[route] = [fn];
      this.switchboard.listen('portal:/' + route, function(message){
        self.run_stack(route, message);
      })
    }
    else{
      this.stack[route].push(fn);
    }
  }
  return this;
}

Portal.prototype.broadcast = function(){
  var self = this;
  if(this.switchboard){
    var args = _.toArray(arguments);
    args[0] = 'portal:/' + args[0];
    this.switchboard.broadcast.apply(this.switchboard, args);
  }
  return this;
}

/*

  we have 4 routes:

    generic shallow:

      supplier.quarryid

    generic deep:

      supplier.a.b.c.d

    method shallow:

      method.supplier.quarryid

    method deep:

      method.supplier.a.b.c.d

  
*/
Portal.prototype.broadcastinstruction = function(instruction){
  var self = this;

  var doneroutes = {};

  _.each(['shallow', 'deep', 'shallowmethod', 'deepmethod'], function(routermode){

    var route = self.router[routermode].apply(self.router, [instruction.method]);

    if(!doneroutes[route]){
      doneroutes[route] = true;
      self.broadcast(route, instruction);
    }
  })

}