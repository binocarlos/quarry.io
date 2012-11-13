module.exports = function(io, supplychain){

	return function(req, res, next){
		res.send('/apples/pears');
	}
	
}