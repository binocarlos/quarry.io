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
var xml = require('./filters/xml');
var utils = require('../utils');

var eyes = require('eyes');

module.exports = extract;

/*
  Quarry.io - Container Args
  --------------------------

  Converts the arguments into container.new into proper container data


 */

function extract(args){

  var single_data = {};
  var model_data = null;

  function processarg(arg){

    if(!arg){
      return;
    }

    if(_.isArray(arg)){
      model_data = arg;
    }
    else if(_.isString(arg)){
      // XML string
      if(arg.match(/^\s*</)){
        model_data = xml.fromXML(arg);
      }
      // JSON string
      else if(arg.match(/^[\[\{]/)){
        model_data = JSON.parse(arg);
      }
      else{
        single_data = utils.extend(true, single_data, {
          '_meta':{
            'tagname':arg
          }
        })
      }
    }
    else if(_.isObject(arg)){
      single_data = arg.cid ? arg : utils.extend(true, single_data, {
        '_attr':arg
      })
    }
  }

  // insert a blank one as a constructor
  if(args.length<=0){
    model_data = [{}]
  }
  else{
    processarg(args[0]);
    processarg(args[1]);
  }

  if(model_data==null){
    model_data = [single_data];
  }

  if(!_.isArray(model_data)){
    model_data = [model_data];
  }

  return model_data;
}