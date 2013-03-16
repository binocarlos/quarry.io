/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var url = require('url');
var express = require('express');

/*

  quarry.io - project router

  Knows how to produce a set of warehouse routes for a given users project

  the project is loaded based upon the config here

  options are:

  	static

  	this is a static list of project routes that is initiated at the start

  	cache

  	this is a cache based list of project routes that can change
  
*/


module.exports = function(projectoptions){

	return function(user){
    if(!projectoptions.type || projectoptions.type=='static'){
      return projectoptions.routes || projectoptions.default;
    }
    else if(projectoptions.type=='user'){
      return user ? (user.attr[projectoptions.attr] || projectoptions.default) : projectoptions.default;
    }
  }
}