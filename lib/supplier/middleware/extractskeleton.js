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
var async = require('async');
var url = require('url');
var eyes = require('eyes');

/*
  Quarry.io - Skeleton Extractor
  ------------------------------

  Middleware that extracts the context of a select query from the request




 */

module.exports = factory;

function factory(){

  return function(req, res, next){

    /*
    
       lets see if there is a skeleton passed as a JSON header
      
    */
    if(req.getHeader('x-json-skeleton')){
      next();
      return;
    }



    /*
    
      Lets see if there is an ID tacked onto the end of the path
      
    */
    var parsedurl = url.parse(req.url);

    var stack_path = req.getHeader('x-quarry-supplier') || '/';
    var pathname = parsedurl.pathname;
    var quarryid = pathname.substr(stack_path.length+1);

    var skeleton = {
      quarrysupplier:stack_path
    }

    if(!_.isEmpty(quarryid)){
      skeleton.quarryid = quarryid;
    }
    else{
      skeleton.supplychainroot = true;
    }

    req.setHeader('x-json-skeleton', [skeleton]);
    next();
  }
}