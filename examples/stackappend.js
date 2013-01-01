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

		warehouse('folder city[name^=b]')
			
			.ship(function(cities){

				var area = io.new('area', {
					name:'Bishopston',
					population:387
				}).addClass('rich')

				cities.append(area).ship(function(appended){

					appended.portal(function(){
						console.log('-------------------------------------------');
						console.log('-------------------------------------------');
						console.log('PORTAL MESSAGE');
					})

					var house = io.new('house', {
						name:'Big House',
						population:3
					}).addClass('grand')

					appended.append(house)
					.on('error', function(error){
						console.log('-------------------------------------------');
						console.log('error');
						eyes.inspect(error.toJSON());
						console.log('-------------------------------------------');
					})
					.ship(function(houses){
						console.log('-------------------------------------------');
						console.log('results');
						eyes.inspect(houses.toJSON());
					})
					
					
					
				})



				
			})
	})
	
	
})