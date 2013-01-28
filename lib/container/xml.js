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
var xml = require('xmldom');

module.exports.parse = fromXML;
module.exports.stringify = toXML;

/*
  Quarry.io - Container XML
  -------------------------

  Knows how to turn an XML string into containers and containers into an XML string


 */

function null_filter(val){
  return !_.isUndefined(val) && !_.isNull(val);
}

function data_factory(element){

  if(element.nodeType!=element.ELEMENT_NODE){
    return;
  }

  var metafields = {
    id:true,
    quarryid:true
  }
  
  var manualfields = {
    tagname:true,
    class:true
  }

  var data = {
    attr:{},
    meta:{
      tagname:element.nodeName,
      classnames:element.getAttribute('class').split(/\s+/)
    },
    children:[]
  }
  
  _.each(metafields, function(v, metafield){
    data.meta[metafield] = element.getAttribute(metafield)
  })

  _.each(element.attributes, function(attr){
    if(!metafields[attr.name] && !manualfields[attr.name]){
      data.attr[attr.name] = attr.value;
    }
  })

  data.children = _.filter(_.map(element.childNodes, data_factory), null_filter);

  return data;
}

function fromXML(string){

  var DOMParser = xml.DOMParser;

  var doc = new DOMParser().parseFromString(string);
  
  return _.map(doc.childNodes, data_factory);
}


function string_factory(data, depth){

  var meta = data.meta || {};
  var attr = data.attr || {};

  function get_indent_string(){
    var st = "\t";
    var ret = '';
    for(var i=0; i<depth; i++){
      ret += st;
    }
    return ret;
  }

  var pairs = {
    id:meta.id,
    quarryid:meta.quarryid,
    class:_.isArray(meta.classnames) ? meta.classnames.join(' ') : ''
  }

  var pair_strings = [];

  _.each(attr, function(val, key){
    pairs[key] = _.isString(val) ? val : '' + val;
  })

  _.each(pairs, function(value, field){
    if(!_.isEmpty(value)){
      pair_strings.push(field + '="' + value + '"');  
    }
  })

  if(data.children && data.children.length>0){
    var ret = get_indent_string() + '<' + meta.tagname + ' ' + pair_strings.join(' ') + '>' + "\n";

    _.each(data.children, function(child){      
      ret += string_factory(child, depth+1);
    })

    ret += get_indent_string() + '</' + meta.tagname + '>' + "\n";

    return ret;    
  }
  else{
    return get_indent_string() + '<' + meta.tagname + ' ' + pair_strings.join(' ') + ' />' + "\n";
  }
}

/*
  This is the sync version of a warehouse search used by in-memory container 'find' commands

  The packet will be either a straight select or a contract
 */
function toXML(data_array){
  return _.map(data_array, function(data){
    return string_factory(data, 0);
  }).join("\n");
}