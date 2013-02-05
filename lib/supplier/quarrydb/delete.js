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

var tools = require('./tools');
var eyes = require('eyes');
var ensure_skeleton = require('./ensure_skeleton');

var log = require('logule').init(module, 'QuarryDB Supplier: delete');

/*
  Quarry.io Quarrydb -> delete
  ----------------------------------

  delete container data

  options
  -------

  {
    
  }

 */

var del = module.exports = function(mongoclient){

  return function(req, res, next){

    log.info('running delete request');

    ensure_skeleton(mongoclient, req, res, function(){
      var skeleton = req.getHeader('x-json-skeleton')[0];

      tools.del(mongoclient, skeleton[0], function(error){
        if(error){
          res.error(error)
        }
        else{
          res.send(skeleton[0]);
        }
      })
    })
    
  
  }
}