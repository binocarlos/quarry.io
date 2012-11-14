var io = require('../');
var eyes = require('eyes');

io.reception()
/*
.use(function(req, res, next){
	res.send('<product></product>');
})

.use(io.supplier('ram.file', {
	path:__dirname+'/ramfiles/fruit.xml'
}))


.use(function(req, res, next){
	eyes.inspect(req.toJSON());
})
*/
.use(io.provider(function(path, callback){
	console.log('-------------------------------------------');
	console.log('make supplier');
	eyes.inspect(path);
	
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