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

var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    async = require('async');
    
/*
  Quarry.io Warehouse
  -------------------

  The warehouse becomes a proxy to some sort of supplier so you can run CSS and get data back.

  So - if I create a new warehouse pointing to a .json file:

    var warehouse = quarryio.warehouse({
      type:'json_file',
      file:__dirname + '/test.json'
    })

  I can now make new containers and save them to the warehouse:

    quarryio.new('product', {
      name:'Chair',
      price:145
    })
    .addClass('onsale')
    .appendTo(warehouse);

  Now I can run a CSS to the warehouse it will load from it's base supplier:

    warehouse('product').ship(function(results){
      // we have a top-level container with results

    })

  Here is get's interesting - because it is a warehouse, I can specify a 'supplier'
  _meta entry.

  If I then pass a selector with a context to a warehouse - the following steps occur:

    1. The context is run against the base supplier (in this case a json_file)

    2. The results from the context are run through a filter function

    3. The filter function maps anything with a 'supplier' config into a trigger function

    4. When the warehouse runs the selector against the context results - the suppliers will have their
       trigger functions run

    5. This is how the cascading database loading of the warehouse works


 */

/***********************************************************************************
 ***********************************************************************************
  Here is the usage (from node.js):

	// make a new warehouse with the given config
  var $quarry = quarryio.warehouse({
		...
  })

  // now the $quarry is like a root container find function
  $quarry('product.onsale[price<100]').each(function(result_container){
	
  })

	$quarry('product.onsale[price<100]').ship(function(results_container){
	
  })

 */


exports.version = '0.0.1';

/**
 * The front door entry point that is just a proxy to create a new container
 *
 * @api public
 */

function factory() {

  return containerFactory.apply(this, _.toArray(arguments));
}

// expose createModule() as the module
exports = module.exports = factory;

