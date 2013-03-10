/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */
var util = require('util');
var utils = require('../../utils');
var eyes = require('eyes');
var _ = require('lodash');
var async = require('async');
var jsonloader = require('../../tools/jsonloader');
var fs = require('fs');
var ejs = require('ejs');
var path = require('path');
var browserify = require('browserify');
var compressor = require('node-minify');

var Container = require('../../container');
var Departments = require('../../department');

module.exports = parsestacks;

/*

  quarry.io - stack parser

  input: stack folder location
  output: stack container data

  
*/

function parsestacks(folders, callback){

  if(!_.isArray(folders)){
    folders = [folders];
  }

  var stacks = [];

  async.forEach(folders, function(folder, nextstack){

    var configpath = folder + '/quarry.json';


    var stack = null;

    /*
    
      check for syntax errors in the stackfile
      
    */
    jsonloader(configpath, function(error, rawstack){

      /*
      
        now we can replace values with data
        
      */
      var rendered = ejs.render(JSON.stringify(rawstack), {
        quarry:{
          codefolder:path.normalize(__dirname + '/../..')
        },
        stack:{
          codefolder:folder
        }
      })

      var data = JSON.parse(rendered);
      data.config.folder = folder;

      /*
      
        this turns the raw json into some containers
        
      */
      var stack = process_raw_stack(data);

      compile_stack_code(stack, function(){
        stacks.push(stack);
        nextstack();
      })
      
    })
  }, function(error){
    callback(error, stacks);
  })
  
}

function process_raw_stack(rawstack){

  var stack = Container.new('stack', rawstack.config);
  stack.id(stack.attr('name').toLowerCase().replace(/\W/g, ''));

  var use_allocations = _.extend({}, Departments.allocation, stack.attr('allocation'));

  rawstack.departments || (rawstack.departments = {});

  /*
  
    the tasklist is the list of services we run within each department

    the start is to give the whole tasklist to one job per department

    all jobs then given to one worker
    
  */
  _.each(Departments, function(name){

    var department = Container.new('department', {
      name:name
    }).id(name)

    /*
            
      make sure we have a 'core' job in each department
      (otherwise nothing will be booted)

      we can then assign workers to these core jobs
      to get the stack booted
      
    */
    var job = Container.new('job', {
      name:name + ' Core',
      /*
      
        this is what is announced as the protocol part of the route
        
      */
      department:name,
      /*
      
        this is what is announced as the path part of the route
        
      */
      route:"/",
      /*
              
        this means X of this core service will be started at the beginning
        
      */
      allocation:use_allocations[name]

    }).addClass(name).addClass('core')

    /*
    
      we now add tasks (user configured bits) to the core job

      they can split out tasks into their own jobs later
      
    */

    _.each(rawstack.departments[name], function(taskconfig){
      var task = Container.new('task', taskconfig);
      job.append(task);
    })

    department.append(job);
    stack.append(department);
  })
  
  return stack;
}

/*

  compile the browser side container code and get it ready for injection into the stack

  the stack config can change how the core code is built here (well later once 
  Rodney finishes running around like Robin from Batman : )
  
*/
function compile_stack_code(stack, callback){
  var codefolder = stack.attr('folder');
  
  var b = browserify();

  b.require(__dirname + '/../../container');
  var st = b.bundle();

  fs.writeFileSync(codefolder + '/browser.js', st, 'utf8');

  new compressor.minify({
    type: 'uglifyjs',
    fileIn: codefolder + '/browser.js',
    fileOut: codefolder + '/browser.min.js',
    callback: function(error){
      if(error){
        throw new Error(error);
      }
      callback();
    }
  })
  
}