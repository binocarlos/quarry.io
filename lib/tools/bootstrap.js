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

var eyes = require('eyes');

function getErrorObject(){
    try { throw Error('') } catch(err) { return err; }
}

function getLineNumber(){
  var err = getErrorObject();
  var caller_line = err.stack.split("\n")[5];
  var match = [];
  if(match = caller_line.match(/\/([^\/]+\.js):(\d+)/)){
    return match[1] + ': ' + match[2];
  }
  else{
    return null;
  }
}

module.exports = function(){
  
  if(process.env.NODE_ENV=='production'){
    return;
  }

  var oldlog = console.log;

  console.log = function(st){
    var num = getLineNumber();
    oldlog(num + ': ' + st);
  }

  eyes.loginspect = function(val){
    var num = getLineNumber();
    oldlog(num + ': *******************************************');
    if(!val){
      oldlog('no value');
      return;
    }
    eyes.inspect(val);
  }
}