var io = require('../');
var async = require('async');

function nerflog(callback){
	var oldlog = console.log;
	console.log = function(){}
	return function(){
		console.log = oldlog;
		callback();
	}
}

describe('supplier', function(){

  it('should route basic requests', function(done) {

  	done = nerflog(done);

  	var supplier = io.supplier.rest({
			get:function(req, res, next){
				res.send('GET');
			},
			post:function(req, res, next){
				res.send('POST');
			}
		})

		function run_req(req, callback){
			var req = io.contract.request(req);

			var res = io.contract.response(callback);

			supplier(req, res, function(){
				res.send('not found');
			})
		}

		async.series([
			function(next){
				run_req({
					method:'get',
					url:'/'
				}, function(error, res){
					res.body.should.equal('GET');
					next();
				})
			},

			function(next){
				run_req({
					method:'post',
					url:'/'
				}, function(error, res){
					res.body.should.equal('POST');
					next();
				})
			},

			function(next){
				run_req({
					method:'put'
				}, function(error, res){
					res.body.should.equal('not found');
					next();
				})
			}
		], done)

  })

  

  
})
