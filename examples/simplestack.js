var io = require('../');
var eyes = require('eyes');

io
.network('development', require('./network.json'))
.stack({
	hostname:'dev.jquarry.com',
	path:__dirname+'/stack'
})
.ready(function(network){
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('stack is ready');
})