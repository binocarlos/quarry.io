var io = require('../');
var eyes = require('eyes');

var supplier = io.supplier.quarrydb({
	'collection':'testing123'
})

var child = io.new('product', {
	price:100
})

var req = io.network.request({
	method:'post',
	body:child.toJSON()
})

var res = io.network.response();

res.on('send', function(){
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	eyes.inspect(res.toJSON());
})

supplier(req, res, function(){
	res.send('not found');
})