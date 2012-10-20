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

var validate_rules = {
  email:/^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/,
  money:/^\d+(\.\d{1,2})?$/,
  required:/.+/,
  number:/^[\-\+]?\d+(\.\d+)?$/,
  integer:/^\d+$/,
  float:/^\d+\.\d+$/
}

// check the field for rules and stuff
function standard_validator(field){
  
  return function(val){
    var rules = field.rules || [];

    if(!val){
      val = '';
    }

    if(field.required){
      rules.push('required');
    }
    // this means that an empty value passes
    else{
      if(val.length<=0){
        return true;
      }
    }

    // run the regexps and get a list of failed rule names
    var failed_rules = _.reject(rules, function(rule){
      if(_.isString(rule)){
        rule = validate_rules[rule];
      }
      return val.match(rule);
    })

    return failed_rules.length<=0 ? true : failed_rules;
  }
  
}


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
    Return a flat array of field defs with no structure
   */
  blueprint.flat_fields = function(){

    function flatten(fields){
      var ret = [];

      _.each(fields, function(field){
        if(field.fields){
          ret = ret.concat(flatten(field.fields));
        }
        else{
          ret.push(field);
        }
      })

      return ret;
    }
    
    return flatten(this.fields());
  }

  blueprint.validate_field = function(container, field){

    if(_.isString(field)){
      field = this.get_field_by_name(field);
    }

    if(!field){
      return true;
    }

    // generate a validation function for the field
    var validator = standard_validator(field);

    // run it - the result is either true or an array of failed rule names
    return validator(container.attr(field.field));
  }

  /*
    loop and return field by name
   */
  blueprint.get_field_by_name = function(fieldname){
    return _.find(this.flat_fields(), function(field){
      return field.field==fieldname;
    })
  }

  /*
    Run the validation against the given container and return either true or an object of failed fields
   */
  blueprint.validate = function(container){
    var self = this;

    var failed = {};

    // loop each of the blueprint fields
    _.each(self.flat_fields(), function(field){

      var result = self.validate_field(container, field);

      // add to the list if it's a fail
      if(result!==true){
        failed[field.field] = result
      }
    })

    if(_.keys(failed).length<=0){
      return true;
    }
    else{

      return failed;
    }
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

