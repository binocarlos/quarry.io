var io = require('../lib/quarryio');
var async = require('async');
var eyes = require('eyes');

var default_route = {
	driver:'json_file',
	file:__dirname + '/country.json'
}

var factory = function(route){
	route || (route = default_route);
	
	var parts = route.split('://');
	var driver = parts[0];
	var data = parts[1];
}

// the warehouse is something that turns routing strings into supply chains
//
// if there is no route in a packet - we silenty drop it
//
io.boot(io.warehouse(function(route, callback){

	// the default supply chain
	if(!route){
		console.log('APPLES');
		io.json_file({
			file:__dirname + '/country.json'
		}, callback)
	}
	else{
		console.log('-------------------------------------------');
		console.log('ROUTER!');
		console.dir(route);	
	}

})).ready(function(warehouse){

	console.log('-------------------------------------------');
	console.log('here');
	console.dir(warehouse.quarryid());
	warehouse('area').ship(function(results){
		eyes.inspect(results);
	})
})