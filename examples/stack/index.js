module.exports = function(io){

	var warehouse = io.warehouse();

	// the main project router
	// this decides what path to use for a / request
	warehouse.use(function(req, res, next){
		if(req.path()=='/'){
				req.send('at root home')
		}
	})

	return warehouse;
	
}