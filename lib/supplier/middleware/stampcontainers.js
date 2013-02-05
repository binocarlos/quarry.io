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
  Quarry.io - Container Stamp
  ---------------------------

  Inject the route from the supplier into the returned container data

  this is setup as an event listener on the request

  you can also pass in an extra map function

 */

module.exports = factory;

function factory(mapper){

  return function(req, res, next){

    /*
    
      hook up the container filter when the response is sent
      
    */
    res.on('beforesend', function(){
      if(!res.isContainers()){
        return;
      }
      var data = res.body;
      if(!_.isArray(data)){
        data = [data];
      }
      res.body = _.map(data, function(result){
        result.meta || (result.meta = {});
        
        /*
    
          the basic routing function is to inject the route into the container stamp
          
        */
        if(req.getHeader('x-quarry-supplier') && !result.meta.quarrysupplier){
          /*
            
            the base route is pointing to the supplier
            
          */
          result.meta.quarrysupplier = req.getHeader('x-quarry-supplier');
        }

        mapper && mapper(result);

        return result;

      })
    })

    next();
  }
}