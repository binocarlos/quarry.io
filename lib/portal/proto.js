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

var util = require('util');
var utils = require('../utils');
var EventEmitter = require('events').EventEmitter;
var inspectselect = require('../container/inspectselect');
var Router = require('../container/router');
var _ = require('lodash');
var Message = require('./message');
var Radio = require('./radio');

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

  this.container = container;
  this.spawn = _.bind(container.spawn, container);
  this.switchboard = container.get_switchboard();
  this.router = Router(container.skeleton());
}

/*

  attach a skeleton and a switchboard client
  
*/
Portal.prototype.attach = function(skeleton, switchboard){
  this.skeleton = skeleton;
  switchboard && (this.switchboard = switchboard);
  this.router = Router(this.skeleton);
}

function processselector(selector, handler){
  var deepmode = false;
  if(selector){
    var parsed = inspectselect(selector);
    selector = parsed[0][0];
    deepmode = selector.splitter!='>';
    delete(selector.splitter);

    /*
    
      check we have a way of making containers without referencing the container back (circular deps)
      
    */
    var orighandler = handler;
    handler = function(message){
      orighandler(message, selector);
    }
  }

  handler.deepmode = deepmode;

  return handler;
}

function targetportal(httpmethod){

  return function(selector, fn){
    var self = this;

    if(!fn){
      fn = selector;
      selector = null;
    }

    if(!this.spawn){
      throw new Error('saved cannot run added without a spawn function');
    }

    var handler = processselector(selector, function(message, selector){
      
      var target = message.get_target();

      if(!selector){
        fn(message.body, target);
        return;
      }
      else if(target.match(selector)){
        fn(message.body, target);
        return; 
      }
    })

    this._register(httpmethod, handler);
  }
}

function containerportal(httpmethod){

  return function(selector, fn){

    var self = this;

    if(!fn){
      fn = selector;
      selector = null;
    }

    if(!this.spawn){
      throw new Error('appended cannot run added without a spawn function');
    }

    var handler = processselector(selector, function(message, selector){
      
      var containers = message.get_containers();
      var target = message.get_target();

      if(!selector){
        fn(containers);
        return;
      }
      else{
        if(handler.deepmode){
          containers = containers.descendents();
        }

        var results = containers.filter(selector);
        results.count()>0 && fn(results, target);
      }
    })

    this._register(httpmethod, handler);

    return this;
  }
}

Portal.prototype.appended = containerportal('post');

Portal.prototype.saved = targetportal('put');

Portal.prototype.deleted = targetportal('delete');

var syncmethods = {
  post:function(container, message){
    
    var messagetarget = message.get_target();
    var messagecontainers = message.get_containers();

    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){

      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      /*
      
        if there are no targets loaded then return
        
      */
      if(containertarget.count()>0){
        containertarget.append(messagecontainers);
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        container.append(messagecontainers);
      }
    }
    
  },
  put:function(container, message){
    var messagetarget = message.get_target();
    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){



      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      /*
      
        if there are no targets loaded then return
        
      */
      if(containertarget.count()>0){
        containertarget.inject(message.body);
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        container.inject(message.body);
      }
    }
  },
  delete:function(container, message){
    var messagetarget = message.get_target();

    /*
    
      in deep mode we look through the loaded data
      and match and appends to the ones we have loaded
      
    */
    if(message.deepmode){

      /*
      
        get a reference to the target within the container
        
      */
      var containertarget = container.find('=' + messagetarget.quarryid());

      if(containertarget.count()>0){
        if(containertarget.parent){
          containertarget.parent.removechildren(messagetarget);
        }
        else{
          containertarget.remove(messagetarget);
        }
      }
    }
    /*
    
      in shallow mode we are assuming that the target is the container
      
    */
    else{
      if(container.quarryid()==messagetarget.quarryid()){
        if(container.parent){
          container.parent.removechildren(messagetarget);
        }
        else{
          container.remove(messagetarget);
        }
      }
    }
  }
}
/*

  if the portal is linked to a container this will keep the local data in
  line with all deep changes
  
*/
Portal.prototype.sync = function(){
  var self = this;
  if(!this.container){
    return this;
  }

  var deepmode = false;
  var callback = null;

  if(arguments.length==1){
    if(_.isBoolean(arguments[0])){
      deepmode = arguments[0];
    }
    else if(_.isFunction(arguments[0])){
      callback = arguments[0];
    }
  }
  else if(arguments.length==2){
    deepmode = arguments[0];
    callback = arguments[1];
  }

  this.raw(deepmode, function(message){
    message.deepmode = deepmode;
    syncmethods[message.method] && syncmethods[message.method].apply(self, [self.container, message]);
    callback && callback(message, self.container);
  })

  return this;
}

Portal.prototype.raw = function(deepmode, fn){
  if(!fn){
    fn = deepmode;
    deepmode = false;
  }

  fn.deepmode = deepmode;

  this._register('*', fn);

  return this;
}

Portal.prototype.close = function(){
  var self = this;
  _.each(self.stack, function(route){
    _.each(self.stack[route], function(fn){
      self.switchboard.cancel(route, fn);
    })
  })
  this.stack = {};
  return this;
}

/*

  internal method as a proxy onto the actual switchboard
  
*/
Portal.prototype._register = function(httpmethod, fn){
  var self = this;

  var usemethod = httpmethod && httpmethod!='*';

  var routermethod = (fn.deepmode ? 'deep' : 'shallow') + (usemethod ? 'method' : '');
  var route = self.router[routermethod].apply(self.router, [httpmethod]);

  self._listen(route, function(messagedata){
    var message = new Message(messagedata, self.spawn);

    fn(message);
  })

  return this;
}

Portal.prototype.run_stack = function(route, message){
  var self = this;
  _.each(this.stack[route], function(fn){
    fn && fn(message);
  })
}

Portal.prototype._listen = function(route, fn){
  return this._prependlisten('portal:/', route, fn);
}

/*

  allows different protocols over the switchboard (like radio for instance)
  
*/
Portal.prototype._prependlisten = function(prepend, route, fn){
  var self = this;
  if(this.switchboard){
    if(!this.stack[route]){
      this.stack[route] = [fn];
      this.switchboard.listen(prepend + route, function(message){
        self.run_stack(route, message);
      })
    }
    else{
      this.stack[route].push(fn);
    }
  }
  return this;
}

/*

  
*/
Portal.prototype._broadcast = function(route, message){
  return this._prependbroadcast('portal:/', route, message);
}

/*

  allows different protocols over the switchboard (like radio for instance)
  
*/
Portal.prototype._prependbroadcast = function(prepend, route, message){
  var self = this;
  if(this.switchboard){
    this.switchboard.broadcast.apply(this.switchboard, [prepend + route, message]);
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
      self._broadcast(route, instruction);
    }
  })

}

Portal.prototype.radio = function(){
  return new Radio(this);
}