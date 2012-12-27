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

		warehouse('folder')

			.ship(function(folders){
				
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('folder is loaded');
				eyes.inspect(folders.toJSON());
			
				folders('city')
					
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

						cities.append(area, function(res){
							console.log('-------------------------------------------');
							console.log('-------------------------------------------');
							console.log('appended');
							eyes.inspect(res);
						})
						*/
					})
	
			})
			
			
	})
	
	
})