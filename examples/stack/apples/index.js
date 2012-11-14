module.exports = function(io){

	return function(req, res, next){
		res.send('/apples');
	}
	
}