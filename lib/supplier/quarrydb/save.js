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

var log = require('logule').init(module, 'QuarryDB Supplier: save');

/*
  Quarry.io Quarrydb -> save
  ----------------------------------

  save container data

  options
  -------

  {
    
  }

 */

var save = module.exports = function(mongoclient){

  return function(req, res, next){

    log.info('running save request');

    var self = this;

    var skeleton = req.getHeader('x-json-skeleton')[0];

    if(!skeleton){
      res.error('cannot find container');
      return;
    }

    var query = {
      "meta.quarryid":skeleton.quarryid
    }

    var savedata = {
      "$set":req.body
    }

    tools.save(mongoclient, query, savedata, function(error){
      if(error){
        res.error(error);
      }
      else{
        res.send(data);
      }
    })
  }
}