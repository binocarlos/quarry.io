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
var utils = require('../utils');
var eyes = require('eyes');
var Warehouse = require('../warehouse');
var ThreadServer = require('./server');

module.exports = factory;

/*
  Quarry.io - Map Thread Server
  -----------------------------

  A function thread server that will do map operations on the input data

  Whatever is emitted is collected and send on

  The map thread server exists in the context of a single result set

  It has no knowledge of it's position in the overall resolving contract


 */

function factory(options, system){

  var server = new ThreadServer(options);

  var warehouse = Warehouse();

  warehouse.post(function(req, res, next){

    server.run(req.getHeader('x-json-quarry-stackpaths'), req.getHeader('x-quarry-mapfn'), req.body, function(error, results){
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('map results');

      eyes.inspect(results);
    })
  })

  warehouse.use(function(req, res, next){
    res.send404();
  })

  warehouse.listen = _.bind(server.listen, server);

  return warehouse;
}