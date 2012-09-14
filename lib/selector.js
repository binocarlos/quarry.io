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

/***********************************************************************************
 ***********************************************************************************
  Here is the  data structure:

  "selector": " > * product.onsale[price<100] > img caption.red, friend",
  "phases":
    [
      [
          {
              "splitter": ">",
              "tag": "*"
          },
          {
              "splitter": "",
              "tagname": "product",
              "classnames": {
                  "onsale": true
              },
              "attr": [
                  {
                      "field": "price",
                      "operator": "<",
                      "value": "100"
                  }
              ]
          },
          {
              "splitter": ">",
              "tagname": "img"
          },
          {
              "splitter": "",
              "tagname": "caption",
              "classnames": {
                  "red": true
              }
          }
      ],
      [
          {
              "tagname": "friend"
          }
      ]
    ]

 */

/*
  Regular Expressions for each chunk
*/

var chunkers = [
  // the 'type' selector
  {
    name:'tagname',
    regexp:/^(\*|\w+)/,
    mapper:function(val, map){
      map.tag = val;
    }
  },
  // the '.classname' selector
  {
    name:'classnames',
    regexp:/^\.\w+/,
    mapper:function(val, map){
      map.class || (map.class={});
      map.class[val.replace(/^\./, '')] = true;
    }
  },
  // the '#id' selector
  {
    name:'id',
    regexp:/^#\w+/,
    mapper:function(val, map){
      map.id = val.replace(/^#/, '');
    }
  },
  // the '=quarryid' selector
  {
    name:'quarryid',
    regexp:/^=\w+/,
    mapper:function(val, map){
      map.quarryid = val.replace(/^=/, '');
    }
  },
  // the ':modifier' selector
  {
    name:'modifier',
    regexp:/^:\w+/,
    mapper:function(val, map){
      map.modifier || (map.modifier={});
      map.modifier[val.replace(/^:/, '')] = true;
    }
  },
  // the '[attr<100]' selector
  {
    name:'attr',
    regexp:/^\[.*?["']?.*?["']?\]/,
    mapper:function(val, map){
      map.attr || (map.attr=[]);
      var match = val.match(/\[(.*?)([=><\^\|\*\~\$\!]+)["']?(.*?)["']?\]/);
      if(match){
        map.attr.push({
          field:match[1],
          operator:match[2],
          value:match[3]
        });
      }
      else {
        map.attr.push({
          field:attrString.replace(/^\[/, '').replace(/\]$/, '')
        });
      }
    }
  },
  // the ' ' or ' > ' splitter
  {
    name:'splitter',
    regexp:/^[ ,<>]+/,
    mapper:function(val, map){
      map.splitter = val.replace(/\s+/g, '');
    }

  }
];

/**
  Parse selector string into flat array of chunks
 
  Example in: product.onsale[price<100]
 */
var parseChunks = function(selector){

  var lastMatch = null;
  var workingString = selector ? selector : '';
  var lastString = '';

  // this is a flat array of type, string pairs
  var chunks = [];

  var matchNextChunk = function(){

    lastMatch = null;

    for(var i in chunkers){
      var chunker = chunkers[i];

      if(lastMatch = workingString.match(chunker.regexp)){

        // merge the value into the chunker data
        chunks.push(_.extend({
          value:lastMatch[0]
        }, chunker));

        workingString = workingString.replace(lastMatch[0], '');

        return true;
      }
    }
    
    return false;

  }
  
  // the main chunking loop happens here
  while(matchNextChunk()){
    
    // this is the sanity check in case we match nothing
    if(lastString==workingString){
      break;
    }
  }

  return chunks;
}



/**
 * turns a selector string into an array of arrays (phases) of selector objects
 *
 * @api public
 */
var parseSelector = function(selector){

  var chunks = parseChunks(selector);

  var phases = [];
  var currentPhase = [];
  var currentSelector = {};

  var addCurrentPhase = function(){
    if(currentPhase.length>0){
      phases.push(currentPhase);
    }
    currentPhase = [];
  }

  var addCurrentSelector = function(){
    if((_.keys(currentSelector)).length>0){
      currentPhase.push(currentSelector);
    }
    currentSelector = {};
  }

  var addChunkToSelector = function(chunk, selector){
    chunk.mapper.apply(null, [chunk.value, selector]);
  }

  _.each(chunks, function(chunk){
    if(chunk.name=='splitter' && chunk.value.match(/,/)){
      addCurrentSelector();
      addCurrentPhase();
    }
    else{

      if(chunk.name=='splitter'){
        addCurrentSelector();
      }

      addChunkToSelector(chunk, currentSelector);

    }
  })

  addCurrentSelector();
  addCurrentPhase();

  return phases;
}

/**
 * exposed factory - accepts a selector string and default drives - return an array of phases
 */

var factory = function(selector){

  // first lets grab the phases from the selector
  var phases = parseSelector(selector);

  return {
    selector:selector,
    phases:phases
  }
}

exports = module.exports = factory;
