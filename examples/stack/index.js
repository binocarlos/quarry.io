var eyes = require('eyes');

module.exports = function(io){

	/*


		The main routing function for the entry warehouse

	 */
	return function(req, res, next){

		// redirect to the default database path
		req.redirect('/oranges');
	}

}