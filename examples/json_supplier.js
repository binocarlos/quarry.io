var io = require('../lib/quarryio');

// this is a double stack supply chain
var supply_chain = io.json_file({	
	file:__dirname + '/country.json',
	pretty:true			
})

	// make a new warehouse so we can run selectors against the data source
io.warehouse(supply_chain).ready(function(warehouse){

	warehouse('city').each(function(result){
		console.log('' + result);
	})

	warehouse('area').when(function(result){
		console.log(result.count());
	})


	/*
	var supplier = warehouse.create()
		.tagname('supplier')
		.attr({
			file:__dirname + '/fruit.json',
			pretty:true	
		})
		.addClass('food');
	
	warehouse.append(supplier);
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


