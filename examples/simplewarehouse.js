var io = require('../');
var eyes = require('eyes');

io.warehouse()
.use(io.supplier({
	
}))
.ready(function(warehouse){
	
	warehouse('fruit caption').ship(function(results){

		console.log('-------------------------------------------');
		console.log('results');
		eyes.inspect(results.toJSON());
	})
	

})




/*
	var supplier = io.supplier('ram.file', {
		format:'xml',
		file:__dirname+'/ramfiles/' + path
	})
	callback(null, supplier);

	*/