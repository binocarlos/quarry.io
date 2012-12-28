var io = require('../');
var eyes = require('eyes');
var stare = eyes.inspector({maxLength:409600});

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

		function runquery(query) {
			warehouse(query).ship(function(container, errors){
				stare(container.toJSON(), query);
			})
		}

		runquery('folder city[name^=b]');
		runquery('folder city.south');
		runquery('folder city.south[name^=b]');
		runquery('folder city[name^=l]');
		runquery('folder city.north');
		runquery('folder city[team^=a]');
	})
	
	
})