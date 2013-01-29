var io = require('../');
var eyes = require('eyes');
var async = require('async');

var supplier = io.supplier.quarrydb({
	'collection':'testing123'
})

var child = io.new('product', {
	price:100
})

async.series([
	function(next){
		var req = io.network.request({
			method:'post',
			body:child.toJSON()
		})

		var res = io.network.response();

		res.on('send', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('after POST');
			eyes.inspect(res.toJSON());
			next();
		})

		supplier(req, res, function(){
			res.send('not found');
		})
	},

	function(next){
		var req = io.network.request({
			method:'get',
			url:'/?q=product'
		})

		var res = io.network.response();

		res.on('send', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('after GET');
			eyes.inspect(res.toJSON());
			next();
		})

		supplier(req, res, function(){
			res.send('not found');
		})
	}
])

