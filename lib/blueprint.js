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

module.exports = factory;

/*
  Quarry.io Blueprint
  -------------------

  Understands a skeleton of data and field descriptions

  Used to build forms and validate containers

 */

/***********************************************************************************
 ***********************************************************************************
  Here is the  data structure:

  // the default values to fill inside a new container
  "stub":{
    "_meta":{
      "tagname":"product"
    },
    "price":100
  }

  // an array of field definitions
  // each element is turned into an object
  // if the object contains a "fields" prop it recurses
  // each field has a 'type' - this triggers either a primitive or another blueprint
  //
  "fields":
    [
      {
        type:"text",
        title:"Your Name",
        field:"name",
        validate:[
          'required',
          {
            regexp:"/\w/",
            title:"Special name for rule"
          }
        ]
      },

      "comment", // this defaults to above (but with no validation)

      // notice this does not have a 'field'
      // this means it is visual only
      {
        type:"tab",
        title:"Another tab",
        fields:[
          ...
        ]
      }


    ]

 */

/**
 * blueprint factory - pass it the raw data loaded from somewhere
 */

function factory(data){

  data || (data = {});

  function blueprint(){}

  blueprint._is_blueprint = true;

   /*
    Trim the object ready to be inserted into containers
   */
  blueprint.raw = function(){
    return {
      stub:data.stub || {},
      options:data.options || {},
      fields:data.fields || []
    }
  }

   /*
    Trim the object ready to be inserted into containers
   */
  blueprint.options = function(){
    return data.options || {};
  }

  /*
    The raw data to get a container going
   */
  blueprint.stub = function(container){
    return data.stub || {}
  }

 

  /*
    Process the fields array ready to build a form with
   */
  blueprint.fields = function(raw){

    if(raw){
      return data.fields || [];
    }

    function process_field(field){

      // expand a string into a default text field
      if(_.isString(field)){
        field = {
          type:'text',
          field:field
        }
      }

      if(field.fields){
        field.fields = _.map(field.fields, process_field);
      }

      return field;
    }

    return _.map(data.fields, process_field);
  }

  return blueprint;
}

