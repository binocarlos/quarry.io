var io = require('../');
var eyes = require('eyes');

var container = io.new('product', {
	name:'Table',
	price:120
})
.addClass('apples')
//.id('table')

var caption = io.new('caption', {
	name:'Review',
	text:'This is good'
})
.addClass('positive')

container.append(caption);

eyes.inspect(container.find('caption.positive').toJSON());