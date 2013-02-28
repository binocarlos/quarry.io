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
var eyes = require('eyes');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var dye = require('dye');
var url = require('url');
var cheerio = require('cheerio');
/*

  quarry.io - chunker middleware

  processes any HTML files for quarry tags that might be processed
  by a script server
  
*/

function repeat(){

  return {
    template:'',
    selector:''
  }
}

function parseattr(st){
  var attr = {};

  _.each(st.match(/(\w+)="([^"]*?)"/g), function(match){
    var parts = match.split('=');
    var key = parts[0];
    var value = parts[1].replace(/^"/, '').replace(/"$/, '');

    attr[key] = value;
  })

  return attr;
}

module.exports = Chunker;

function Chunker(warehouse){
  EventEmitter.call(this);
  this.warehouse = warehouse;

  

}

util.inherits(Chunker, EventEmitter);

/*

  prepare a function that will execute this HTML page as a quarry page

  (this fn can be cached later for opti-max-speed-done-ting)
  
*/
Chunker.prototype.compile = function(warehouse, html, callback){

  var match = null;

  var chunks = [];
  var count = 0;

  while(match = html.match(/<warehouse.*?>(.|\n)*?<\/warehouse>/i)){
    var orig = match[0];

    var id = count++;
    chunks.push({
      id:id,
      html:orig
    })
    
    html = html.replace(orig, '<chunk' + id + '>');
  }

  var output = '' + html;

  async.forEach(chunks, function(chunk, nextchunk){

    var warehousematch = null;

    if(warehousematch = chunk.html.match(/<warehouse(.*?)>((.|\n)*?)<\/warehouse>/)){
      var attr = parseattr(warehousematch[1]);
      var content = warehousematch[2];

      if(!attr.ship){
        nextchunk();
        return;
      }

      var contentmatch = null;
      $ = cheerio.load(content);

      function process(repeat, container){

        var results = container.find(repeat.attr('selector'));

        var html = '';

        results.each(function(result){

          var copy = repeat.clone();

          function getnextrepeat(){
            return copy.find('repeat').length>0 ? copy.find('repeat').first() : null;
          }

          var current = getnextrepeat();
          while(current){
            process(current, result.clone());
            current = getnextrepeat();
          }

          var resulthtml = copy.html();

          resulthtml = resulthtml.replace(/\{\{(.*?)\}\}/, function(prop, contents){
            return result.tagname() + ' : ' + contents + ' = ' +  JSON.stringify(result.toJSON());
          })

          html += resulthtml;
        })

        repeat.replaceWith(html);
      }

      warehouse(attr.ship).ship(function(results){

        function getnextrepeat(){
          return $('repeat').length>0 ? $('repeat').first() : null;
        }

        var current = getnextrepeat();
        while(current){
          process(current, results.clone());
          current = getnextrepeat();
        }
        
        chunk.output = $.html();
        
        nextchunk();
      })
    }
    else{
      chunk.replace = chunk.html;
    }


  }, function(){

    _.each(chunks, function(chunk){
      output = output.replace('<chunk' + chunk.id + '>', chunk.output);
    })

    callback(null, output);
  })


}