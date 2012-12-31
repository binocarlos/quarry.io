var io = require('../');
var eyes = require('eyes');


io
.network('development', require('./network.json'))
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack'
})
.listen(function(network){

	network.warehouse('dev.jquarry.com', function(warehouse){

		warehouse('area', 'folder city[name^=b]')
				
			.ship(function(cities){

				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('cities is loaded');
				eyes.inspect(cities.count());
/*
				var area = io.new('area', {
					name:'Hotwells',
					population:320
				}).addClass('rich')

				cities.append(area);

				eyes.inspect(cities.toJSON());

				
				, function(res){
					console.log('-------------------------------------------');
					console.log('-------------------------------------------');
					console.log('appended');
					eyes.inspect(res);
				})
				*/
			})
			
			
	})
	
	
})