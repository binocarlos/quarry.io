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

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
/*

  quarry.io - worker heartbeat

  simple looping event emitter

  
*/

module.exports = function(delay){

  var heartbeat = {
    counter:0,
    delay:delay,
    start:function(newdelay){
      if(newdelay){
        this.delay = newdelay;
      }
      this.cancelid = setInterval(_.bind(this.beat, this), this.delay || 1000);
    },
    beat:function(){
      this.counter++;
      this.emit('beat', this.counter);
    },
    isRunning:function(){
      return this.cancelid!=null;
    },
    stop:function(){
      clearInterval(this.cancelid);
      this.cancelid = null;
    }
  }

  _.extend(heartbeat, EventEmitter.prototype);

  return heartbeat;
}