var io = require('../');
var async = require('async');

describe('warehouse', function(){

  it('should route basic requests', function(done) {
  	var server = io.warehouse();

		server.post('/test', function(req, res, next){
			res.send('hello world');
		})

		function run_req(req, callback){
			var req = io.network.request(req);

			var res = io.network.response();

			res.on('send', function(){
				callback(null, res);
			})

			server(req, res, function(){
				res.send('not found');
			})
		}

		async.series([
			function(next){
				run_req({
					method:'get',
					url:'/test'
				}, function(error, res){
					res.body.should.equal('not found');
					next();
				})
			},

			function(next){
				run_req({
					method:'post',
					url:'/test'
				}, function(error, res){
					res.body.should.equal('hello world');
					next();
				})
			}
		], done)

  })

  

  
})
