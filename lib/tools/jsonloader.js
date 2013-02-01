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


var _ = require('lodash');
var fs = require('fs');
var exec = require('child_process').exec;
var dye = require('dye');

var binpath = __dirname + '/../../node_modules/.bin/jsonlint';

var log = require('logule').init(module, 'Network');

module.exports = function(jsonpath, onerror){

  var data = null;

  if(!fs.existsSync(jsonpath)){
    log.error(dye.red(jsonpath) + ' does not exist');
    onerror && onerror();
    return null;
  }

  try{
    data = require(jsonpath);
  } catch(error){

    log.error('error loading: ' + dye.green(jsonpath) + ' - ' + dye.red(error));

    child = exec(binpath + ' ' + jsonpath, function (error, stdout, stderr){

      console.log(stderr);
      onerror && onerror();
    })
    
  }

  return data;
}