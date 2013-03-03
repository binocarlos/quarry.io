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
var Portal = require('../../portal/proto');
var Container = require('../../container');
var eyes = require('eyes');

/*
  Quarry.io - Security Middleware
  -----------------------------

  Checks the config of the supplier for access rules
  and filters the input skeleton and stamped containers
  and plucks them

 */

module.exports = factory;

function factory(options){

  var defaultaccess = options.default;
  var resultaccess = _.extend({}, defaultaccess);
  var selectors = options.selectors;

  return function(req, res, next){

    function determineaccess(accessobj){
      if(!accessobj.read){
        blockcontent();
        return;
      }
      else if(req.method!='get' && !accessobj.write){
        blockcontent();
        return; 
      }
      else{
        next();
      }
    }

    function blockcontent(){
      res.statusCode = 403;
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('access blocked');
      eyes.inspect(req.toJSON());
      res.error('resource not accessible by that user');
      return;
    }

    var rawuser = req.getHeader('x-json-quarry-user');

    if(!rawuser){
      determineaccess(defaultaccess);
      return;
    }

    var user = Container.new([rawuser]);

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('before');
    eyes.inspect(user.toJSON());
    eyes.inspect(defaultaccess);

    async.forEach(_.keys(selectors), function(selector, next_selector){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('run selector');
      eyes.inspect(selector);

      if(!user.find(selector).count()>0){
        next_selector();
        return;
      }

      var access = selectors[selector];

            console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('merge resuts selector');
      eyes.inspect(access);

      _.each(access, function(val, prop){
        if(val!=defaultaccess[prop]){
          resultaccess[prop] = val;
        }
      })

      console.log('-------------------------------------------');
      eyes.inspect(resultaccess);

      next_selector();

    }, function(error){

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('after access');
      eyes.inspect(resultaccess);

      determineaccess(resultaccess);
      
    })

  }
}