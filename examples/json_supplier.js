var io = require('../lib/quarryio');

var supply_chain = io.json_file({	
	file:__dirname + '/country.json',
	pretty:true			
});

	// make a new warehouse so we can run selectors against the data source
io.warehouse(supply_chain).ready(function(warehouse){


	warehouse('> [name^=S] city.big').each(function(result){
		console.log('' + result);
	})

	
	/*
	var product = warehouse.create()
		.tagname('product')
		.attr({
			price:100,
			color:'red'
		})
		.addClass('onsale')
		.append(warehouse.create()
			.tagname('caption')
			.attr({
				text:'Hello World'
			}));

	
	warehouse.append(product);
	*/
	
	//console.dir(product.raw());

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


