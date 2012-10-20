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

var nested = require('../vendor/backbonenested');
var helpers = require('./helpers');
var utils = require('../utils');
var _ = require('underscore');

var eyes = require('eyes');

/*
  Quarry.io - Container Base
  --------------------------

  Represents a single container data
  
  This is a nested backbone model

  It will trigger Backbone.sync which has been defined by the quarry.io environment to
  route via a supply chain

  You can also override a single model sync to point it to another supply chain

 */

var Base = nested.extend({

  /*
    the flag to tell us apart from a vanilla object
   */
  _quarrycontainer:true,

  /*
    ensure there is a quarryid for every container
   */
  initialize:function(){
    if(!this.get('_meta.quarryid')){
      this.set('_meta.quarryid', utils.quarryid());
    }
  },

  /*
    return an array of models spawned from the raw data
   */
  children:function(){
    var self = this;
    return _.map(this.get('_children'), function(raw_data){

      var child = new self.constructor(raw_data);

      child.parent = self;

      // we assign the parent route if the child does not have one of it's own
      if(!child.get('_meta.route')){
        child.set('_meta.route', {
          protocol:self.get('_meta.route.protocol'),
          host:self.get('_meta.route.host')
        },{
          silent:true
        })
      }

      return child;
    })
  },

  /*
    low level append - triggers the sync with an append action
   */
  append:function(models){
    if(_.isEmpty(models)){
      return;
    }

    if(!_.isArray(models)){
      models = [models];
    }

    var children = this.get('_children') || [];

    children = children.concat(_.map(models, function(model){
      return model.toJSON();
    }))

    this.set('_children', children, {
      silent:true
    })

  }

  
})

module.exports = Base;