module.exports = function(io){

	warehouse.use(function(req, res, next){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('root warehouse next');
		next();
	})

	return function(req, res, next){
		res.send('/');
	}
	
}