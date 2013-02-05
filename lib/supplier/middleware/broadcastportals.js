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
  Quarry.io - Broadcast Portals
  -----------------------------

  Middleware to look after the broadcasting of events that have happened in the database

  It hooks up a beforesend handler on the response and looks at the x-json-portal-instructions
  to determine what to do

  the switchboard has been assigned to the req by the supplychain

  (otherwise we don't do anything here)

 */

module.exports = factory;

function factory(){

  return function(req, res, next){


    /*
    
       if we are not on a network then we won't have a switchboard
      
    */
   /*
    if(!req.switchboard){
      next();
    }

    res.on('beforesend', function(){

      var instructions = req.getHeader('x-json-portal-instructions') || [];

      if(instructions.length<=0){
        return;
      }
      
      _.each(instructions, function(instruction){

        var portal = new Portal();

        portal.attach(target, req.switchboard);


           
            
              let the request communiate to the switchbaord
              
            
            bootstrapreq.on('portal', function(portalres){

              var portaldata = portalres.getHeader('x-json-portal');

              var skeleton = portaldata.requestheaders['x-json-skeleton'];
              var target = Container.fromskeleton(skeleton);

              var portal = new Portal(target, switchboard);

              portal.broadcast(portaldata.routingkey, portalres.toJSON());

            
      })
    })
})*/
    next();
  }
}