var io = require('../');
var eyes = require('eyes');
var async = require('async');
var utils = require('../lib/utils');

/*

	make some test data
	
*/
var data = '<product price="100"><caption name="testing123"/></product>';
var childdata = '<food name="othertest"/>';

var container = io.new(data);
var child = io.new(childdata);

container.append(child);

/*

	make the stack from container data
	
*/

var stackdata = {
	
	/*
	
		the core stack configuration
		
	*/
	attr:{
		name:"My First Test Stack"	
	},
	/*
	
		database is a single container representing
		a supplier
		
	*/
	database:{
		"module":"io.supplier.quarrydb",
		"config":{
			"collection":"system"
		}
	},
	/*
	
		API contains all of the endpoints within the stack
		
	*/
	api:{
		attr:{
			
		},
		endpoints:[{
			"route":"/",
			"module":"io.supplier.quarrydb",
			"config":{
				"collection":"testing123"
			}
		}]
	},
	/*
	
		contains all of the websites hosted within this stack
		
	*/
	webserver:{
		attr:{
			
		},
		virtualhosts:[{
			"name":"Simples",
			"hostnames":[
				"dev.jquarry.com",
				"localhost:8080",
				"localhost"
			],
			"document_root":__dirname + '/fixtures/websites/simples/www'
		}]
	}
}

var teststack = io.stack(stackdata);

console.log(JSON.stringify(teststack.toJSON(), null, 4));