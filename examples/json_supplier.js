var io = require('../lib/quarryio');

/*
io.json_file({	
	file:__dirname + '/country.json'			
}).warehouse(function(db){
*/

	// make a new warehouse so we can run selectors against the data source
io.warehouse(function(message, next){

	console.log('HAVE THE MESSAGE');
	console.dir(message.contract.selector[0]);

}).ready(function(warehouse){

	var product = warehouse.create()
		.tagname('product')
		.attr({
			price:100,
			color:'red'
		})
		.addClass('onsale');

		console.dir(product.raw());

	//$quarry('product[price<100]');

/*
	.each(function(result){

		result
		.attr('price', 120)
		.append('caption', {
			text:'hello'
		})
		.save(function(){
			console.log('cool');

			result.find('caption').each(function(caption){

			})

			$quarry('caption', result).each(function(caption){

			})
		})

		

	})
*/
})


