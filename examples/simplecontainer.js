var io = require('../');
var eyes = require('eyes');

var container = io.new('product', {
	name:'Table',
	price:120
})
.addClass('apples')
//.id('table')


eyes.inspect(container.eq(0).toJSON());