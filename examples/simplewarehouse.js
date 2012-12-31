var io = require('../');
var eyes = require('eyes');

io
.supplier({
	"driver":"ram.file",
	"directory":"/srv/node_modules/quarrylocal/xmlfiles",
	"path":"cities",
	"format":"xml"
})
.ready(function(warehouse){

	warehouse('area', 'folder city[name^=b]')
			
		.ship(function(areas){

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('areas is loaded');
			eyes.inspect(areas.count());
			eyes.inspect(areas.toJSON());
		})
})