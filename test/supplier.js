var io = require('../');
var async = require('async');

describe('supplier', function(){

  it('should route basic requests', function(done) {

  	var supplier = io.supplier({
			select:function(req, res, next){
				res.send('GET');
			},
			insert:function(req, res, next){
				res.send('POST');
			}
		})

		function run_req(req, callback){
			var req = io.network.request(req);

			var res = io.network.response(callback);

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
