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

describe('warehouse', function(){

  it('should route basic requests', function(done) {
  	
  	done = nerflog(done);

  	var server = io.warehouse();

		server.post('/test', function(req, res, next){
			res.send('hello world');
		})

		function run_req(req, callback){
			var req = io.contract.request(req);

			var res = io.contract.response();

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
