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
var wrench = require('wrench');
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
          folder:path.normalize(__dirname + '/../..')
        },
        stack:{
          folder:folder,
          corefolder:folder + '/quarry/core',
          logfolder:folder + '/quarry/log'
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
  stack
    .id(stack.attr('name').toLowerCase().replace(/\W/g, ''))
    .attr({
      corefolder:stack.attr('folder') + '/quarry/core',
      logfolder:stack.attr('folder') + '/quarry/log'
    })

  /*
  
    a map of the jobs we found by department
    
  */
  var departmentjobs = {};

  var joblist = Container.new('joblist');

  function makejob(rawjob){
    /*
            
      make sure we have a 'core' job in each department
      (otherwise nothing will be booted)

      we can then assign workers to these core jobs
      to get the stack booted
      
    */
    var job = Container.new('job', rawjob);

    if(Departments.bootfirst[job.attr('department')]){
      job.addClass('bootfirst');
    }
    else{
      job.addClass('bootafter');
    }

    job.addClass(job.attr('department'));

    departmentjobs[job.attr('department')] || (departmentjobs[job.attr('department')] = []);
    departmentjobs[job.attr('department')].push(job);

    joblist.append(job);

    return job;
  }

  _.each(rawstack.jobs || [], makejob);


  /*
  
    the tasklist is the list of services we run within each department

    the start is to give the whole tasklist to one job per department

    all jobs then given to one worker
    
  */
  _.each(Departments, function(name){

    if(!departmentjobs[name]){
      makejob({
        department:name
      })
    }
  })

  stack.append(joblist);
  
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

  wrench.mkdirSyncRecursive(codefolder + '/quarry', 0777);
  wrench.mkdirSyncRecursive(codefolder + '/quarry/core', 0777);
  wrench.mkdirSyncRecursive(codefolder + '/quarry/log', 0777);

  fs.writeFileSync(codefolder + '/quarry/core/browser.js', st, 'utf8');

  new compressor.minify({
    type: 'uglifyjs',
    fileIn: codefolder + '/quarry/core/browser.js',
    fileOut: codefolder + '/quarry/core/browser.min.js',
    callback: function(error){
      if(error){
        throw new Error(error);
      }
      callback();
    }
  })
  
}