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
var eyes = require('eyes');


/*
  Quarry.io - Contract Resolver
  -----------------------------

  Middleware that knows how to merge and pipe

  You provide it with a handler function to issue
  indivudal requests to




 */

module.exports = factory;

function factory(api){

  if(!api.handle){
    throw new Error('Select resolver requires a handle method in the API');
  }

  return function(req, res, next){

    /*
    
      we are only interested in quarry/contracts here
      
    */
    if(req.getHeader('content-type')!='quarry/contract'){
      next();
      return;
    }

    console.log('-------------------------------------------');
    console.log('FOUND CONTRACT');
    eyes.inspect(req.toJSON());
    
  }
}