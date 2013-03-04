/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');

module.exports = parse;

/*
  Quarry.io Selector
  -------------------

  Represents a CSS selector that will be passed off to selectors or perform in-memory search

 */

/***********************************************************************************
 ***********************************************************************************
  Here is the  data structure:

  "selector": " > * product.onsale[price<100] > img caption.red, friend",
  "phases":
    [
      [
          {
              "splitter": ">",
              "tagname": "*"
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
      map.tagname = val;
    }
  },
  // the '.classname' selector
  {
    name:'classnames',
    regexp:/^\.\w+/,
    mapper:function(val, map){
      map.classnames || (map.classnames={});
      map.classnames[val.replace(/^\./, '')] = true;
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
    regexp:/^=[\w-]+/,
    mapper:function(val, map){
      map.quarryid = val.replace(/^=/, '');
    }
  },
  {
    name:'hardlink',
    regexp:/^=\>[\w-]*/,
    mapper:function(val, map){
      map.hardlink = val.replace(/^=\>/, '');
    }
  },
  {
    name:'softlink',
    regexp:/^=\~[\w-]*/,
    mapper:function(val, map){
      map.softlink = val.replace(/^=\~/, '');
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


/*
  Parse selector string into flat array of chunks
 
  Example in: product.onsale[price<100]
 */
function parse_chunks(selector, callback){

  var last_match = null;
  var working_string = selector ? selector : '';
  var last_string = '';

  // this is a flat array of type, string pairs
  var chunks = [];

  async.whilst(function(){

    return working_string.length>0;

  }, function(next){

    var found_hit = false;

    async.forEachSeries(chunkers, function(chunker){

      if(last_match = working_string.match(chunker.regexp)){

        // merge the value into the chunker data
        chunks.push(_.extend({
          value:last_match[0]
        }, chunker));

        working_string = working_string.replace(last_match[0], '');

        found_hit = true;
      }

    }, function(){
      if(!found_hit){
        callback('there is a problem parsing that selector - no matches hit: ' + working_string);
      }
    })

    return false;
  }, function(error){
    callback(error, chunks);
  })
}

function create_blank_selector(){
  return {
    classnames:{},
    attr:[],
    modifier:{}
  }
}

/*

  turns a selector string into an array of arrays (phases) of selector objects
 
 */
function parse(selector_string, callback){

  if(!callback){
    throw new Error('inspect select has to be async');
  }

  if(typeof(selector_string) !== 'string'){
    callback('selector must be a string');
    return;
  }

  parse_chunks(selector_string, function(error, chunks){
    if(error){
      callback(error);
      return;
    }
    
    var phases = [];
    var current_phase = [];
    var current_selector = create_blank_selector();

    function add_current_phase(){
      if(current_phase.length>0){
        phases.push(current_phase);
      }
      current_phase = [];
    }

    function add_current_selector(){
      if((_.keys(current_selector)).length>0){
        current_phase.push(current_selector);
      }
      current_selector = create_blank_selector();
    }

    function add_chunk_to_selector(chunk, selector){
      chunk.mapper.apply(null, [chunk.value, selector]);
    }

    _.each(chunks, function(chunk, index){
      if(chunk.name=='splitter' && chunk.value.match(/,/)){
        add_current_selector();
        add_current_phase();
      }
      else{

        if(chunk.name=='splitter' && index>0){
          add_current_selector();
        }

        add_chunk_to_selector(chunk, current_selector);

      }
    })

    add_current_selector();
    add_current_phase();

    callback(null, phases);
  })
}