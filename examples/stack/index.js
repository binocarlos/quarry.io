var eyes = require('eyes');

module.exports = function(io){

	/*


		The main routing function for the entry warehouse

	 */
	return function(req, res, next){

		if(req.path()=='/'){
			// redirect to the default database path
			req.redirect('/ram');	
		}
		else{
			next();
		}
		
	}

}