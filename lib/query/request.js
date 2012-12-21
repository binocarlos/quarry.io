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
var BackboneDeep = require('../vendor/backbonedeep');
var eyes = require('eyes');
var url = require('url');
var utils = require('../utils');

/*
  Quarry.io - Request
  -------------------

  Generic request object - they map onto HTTP requests nicely but can be sent down ZeroMQ

  

 */


/*

  Create a new request object from the raw data
  This is the deserlization step

  /xml/123:456?selector=city.green



  HTTP REST -> QUARRY methods:           

    GET       SELECT
    POST      APPEND
    PUT       SAVE
    DELETE    DELETE

  method: GET|POST|PUT|DELETE

  route:              string or parsed object
    hostname
    path
  
  params            object either from body or querystring
  headers           object from HTTP
  body              raw content of update



  // run a selector and get the content-length as a count of containers in the results
  // used for paging
  {
    method:'head',
    route:{
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },
    params:{
      selector:'product.cheap'
    },
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

  // run a selector against two containers (123 & 456) inside of /db/quarry/bob/db1
  {
    method:'get',
    route:{
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },
    params:{
      selector:'product.cheap'
    },
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

  // append some containers to an existing container inside a database
  {
    method:'post',
    route:{
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:{
      // raw containers
    }
  }

  // save one containers data
  {
    method:'put',
    route:{
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:{
      // raw container data
    }
  }

  // delete two containers
  {
    method:'delete',
    route:{
      hostname:'quarry.io',
      path:'/db/quarry/bob/db1/123:456'
    },    
    headers:{
      content-type:'application/json',
      user:{...}
    },
    body:null
  }

 */

var Request = module.exports = BackboneDeep.extend({
  initialize:function(forceid){
    if(!this.id){
      this.id = utils.quarryid();
      this.set('id', this.id);
    }

    this.requests = [];
    // turn the body array into actual requests
    if(this.isContract()){
      this.requests = _.map(this.body(), function(data){
        return new Request(data);
      })
    }

    if(!this.get('originalPath')){
      this.set('originalPath', this.path());
    }
  },

  toJSON:function(){
    var ret = _.clone(this.attributes);
    
    if(this.isContract()){
      ret.body = this.getRequestData();
    }
    return ret;
  },


  /*


    Contract Methods


   */

  getRequestData:function(){
    return _.map(this.requests, function(req){
      return req.toJSON();
    })
  },

  contentType:function(val){
    return val ? this.header('Content-Type', val) : this.header('Content-Type');
  },

  isContract:function(){
    return this.contentType()=='contract';
  },

  isContractType:function(type){
    return this.isContract() && this.contractType()==type;
  },

  contractType:function(val){
    return val ? this.header('Contract-Type', val) : this.header('Contract-Type');
  },

  addRequest:function(req){
    this.requests.push(req);
    this.body(this.getRequestData());
  },

  route:function(){

  },

  branch:function(){

  },

  broadcast:function(){

  },

  /*


    Data Methods
    

   */

  header:utils.object_accessor('headers'),
  param:utils.object_accessor('params'),
  headers:utils.property_accessor('headers'),
  params:utils.property_accessor('params'),
  body:utils.property_accessor('body'),

  method:utils.property_accessor('method'),
  hostname:utils.property_accessor('hostname'),
  bay_id:utils.property_accessor('bay_id'),
  contract_id:utils.property_accessor('contract_id'),
  branch_index:utils.property_accessor('branch_index'),
  path:utils.property_accessor('path'),
  originalPath:utils.property_accessor('originalPath'),

  pipe:structure('pipe'),
  merge:structure('merge'),

  /*


    Supplier
    

   */

  // return the last chunk of the path
  pathid:function(){
    return this.path().split('/').pop();
  },

  /*


    Promise
    

   */

  ship:function(fn){
    
  },

  match:function(path){
    return this.path().indexOf(path)==0;
  },

  chunk_path:function(){
    return this.path().replace(/\/\w+/, '');
  },

  extract_supplier_quarryid:function(supplier_path){
    return this.path().substr(('/' + supplier_path + '/').length);
  },

  change_path:function(path){
    this.path(path);
    this.originalPath(path);
  },

  assign_route:function(route, index){
    var self = this;
    self.path(route);
    if(arguments.length>1){
      self.header('branch-index', index);  
    }
  }
})



/*


  HELPERS
  

 */


function make_contract(type){
  var req = new Request({
    method:'post',
    route:{
      path:'/reception/' + type
    }
  })

  return req;
}

function structure(type){
  return function(req){
    
    // this means we are already this contract so just add to the body
    if(this.isContractType(type)){
      
      return this;
    }
    // turn the request into a contract
    else{

      var contract = make_contract(type);

      contract.addRequest(this);
      contract.addRequest(req);

      return contract;
    }
  }
}