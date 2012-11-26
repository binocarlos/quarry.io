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

function process_string(arg){
  // XML string
  if(arg.match(/^\s*</)){
    return xml.fromXML(arg);
  }
  // JSON string
  else if(arg.match(/^[\[\{]/)){
    return JSON.parse(arg);
  }

  return null;
}

function extract(args){

  var tagname = null;
  var single_data = {};
  var model_data = null;

  function processarg(arg){
    if(!arg){
      return;
    }

    if(_.isArray(arg)){
      model_data = _.map(arg, function(arg){
        if(_.isString(arg)){
          var processed = process_string(arg);
          return processed ? processed : {
            meta:{
              tagname:arg
            }
          };
        }
        else{
          return arg;
        }
      })
    }
    else if(_.isString(arg)){
      var processed = process_string(arg);
      if(processed){
        model_data = processed;
      }
      else{
        tagname = arg;
      }
    }
    else if(_.isObject(arg)){
      single_data = arg.cid ? arg : utils.extend(true, single_data, {
        'attr':arg
      })
    }
  }

  if(args.length<=0){
    model_data = []
  }
  else{
    processarg(args[0]);
    processarg(args[1]);
  }

  if(single_data && tagname){
    single_data.meta || (single_data.meta = {});
    single_data.meta.tagname = tagname;
  }

  if(model_data==null){
    model_data = [single_data];
  }

  if(!_.isArray(model_data)){
    model_data = model_data ? [model_data] : [];
  }

  return model_data;
}