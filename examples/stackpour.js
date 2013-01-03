var io = require('../');
var eyes = require('eyes');
var fs = require('fs');
var stare = eyes.inspector({maxLength:409600});

var folder = __dirname + "/localfiles";
var network_config = require('./network.json');

network_config.resources.localfiles = folder;

var livefile = folder + '/xmlfiles/cities.xml';
var backupfile = folder + '/xmlfiles/citiesbranch.xml';

var content = fs.readFileSync(backupfile, 'utf8');
fs.writeFileSync(livefile, content, 'utf8');

io
.network('development', network_config)
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack',
	
})
.listen(function(network){

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('network is ready');

	network.warehouse('dev.jquarry.com', function(warehouse){

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('stack is ready');

		warehouse('folder').ship(function(folders){

			folders.find('#places')
				.select('city:tree')
				.ship(function(cities){

					folders.find('#quarrylink')
						.append(cities)
						.ship(function(appended){
							console.log('-------------------------------------------');
							console.log('appended');
							

							warehouse('#quarrylink area').ship(function(quarryareas){
								console.log('-------------------------------------------');
								console.log('-------------------------------------------');
								eyes.inspect(quarryareas.toJSON());
							})
						})
					
				})
			
		})
	})
	
	
})