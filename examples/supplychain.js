var io = require('../');
var eyes = require('eyes');
var async = require('async');
var utils = require('../lib/utils');

var data = '<product price="100"><caption name="testing123"/></product>';
var childdata = '<food name="othertest"/>';

var container = io.new(data);
var child = io.new(childdata);

container.append(child);

var app = io.warehouse();

app.use(io.supplier.quarrydb({
	'collection':'testing123'
}))

app.connect(function($quarry){

})