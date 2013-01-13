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

var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var Backbone = require('../vendor/backbone');
var eyes = require('eyes');
var supplier_factory = require('../supplier/factory');

/*
  Quarry.io - Provider
  --------------------

  


 */

var BaseProvider = module.exports = Backbone.Model.extend({

  initialize:function(){
    this.cache = {};
  },

  ensure_supplier:function(req, res, ready){
    var self = this;
    var path = req.path().split('/')[1];
    req.matchroute('/' + path);

    if(this.cache[path]){
      ready(null, this.cache[path]);
      return;
    }

    this.supplier_factory(path, req, function(error, supplier){
      if(error){
        res.sendError(error);
        return;
      }
      self.cache[path] = supplier;
      ready(null, supplier);
    })
  },

  supplier_factory:function(path, req, ready){

    var supplier_options = this.toJSON();

    /*
    
      the path that entered the stack for this supplier

        /ram/files/xml/cities/12344

        '/ram/files/xml/cities' = stamp

        ''
      
    */
    
    /*
    
      deployment is set inside of warehouse->inject_deployment_to_requests
      
    */
    supplier_options.path = path;
    supplier_options.deployment = req.deployment.toJSON();

    var supplier = supplier_factory(supplier_options, function(error){
      ready(error, supplier);
    })

    return supplier;
  }

  
})