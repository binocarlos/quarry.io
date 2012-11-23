var io = require('../');
var eyes = require('eyes');

io
.network('development', require('./network.json'))
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack',
	
})
.ready(function(network){

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('network is ready');

	network.warehouse('dev.jquarry.com', function(warehouse){

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('stack is ready');

		warehouse('folder city').ship(function(cities, errors){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('cities is loaded');
			eyes.inspect(cities.toJSON());
			eyes.inspect(errors);
			
		})
	})
	
	
})