var io = require('../');
var eyes = require('eyes');
var fs = require('fs');

var folder = __dirname + "/localfiles";
var network_config = require('./network.json');

network_config.resources.localfiles = folder;

var livefile = folder + '/xmlfiles/cities.xml';
var backupfile = folder + '/xmlfiles/citiesbranch.xml';

var livefile2 = folder + '/xmlfiles/usacities.xml';
var backupfile2 = folder + '/xmlfiles/usacities2.xml';

var content = fs.readFileSync(backupfile, 'utf8');
fs.writeFileSync(livefile, content, 'utf8');

var content2 = fs.readFileSync(backupfile2, 'utf8');
fs.writeFileSync(livefile2, content2, 'utf8');


io
.network('development', network_config)
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack'
})
.listen(function(network){

	network.warehouse('dev.jquarry.com', function(warehouse){

		warehouse('folder city[name^=b]')
			
			.ship(function(cities){

				cities.attr({
					'food':'apples'
				}).addClass('saved');

				cities.save()
				.on('error', function(res){
					console.log('error');
					eyes.inspect(res.toJSON());
				})
				.ship(function(results){
					console.log('-------------------------------------------');
					console.log('after save');
					eyes.inspect(results);
				})


				

				
			})
	})
	
	
})