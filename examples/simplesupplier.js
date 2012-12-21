var io = require('../');
var eyes = require('eyes');

io
.network('development', require('./network.json'))
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack'
})







.listen(function(network){

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('network is ready');

	network.warehouse('dev.jquarry.com', function(warehouse){

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('stack is ready');

		warehouse('folder').ship(function(folder){

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('folder is loaded');
			eyes.inspect(folder.toJSON());
			
			folder('city[name^=b]').ship(function(cities){

				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('cities is loaded');
				eyes.inspect(cities.toJSON());

				var area = io.new('area', {
					name:'Hotwells',
					population:320
				}).addClass('rich')

				cities.append(area, function(res){
					console.log('-------------------------------------------');
					console.log('-------------------------------------------');
					console.log('appended');
					eyes.inspect(res);
				})



			})
		})
	})
	
	
})