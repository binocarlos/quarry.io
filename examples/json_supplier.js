var io = require('../lib/quarryio');

// get the root supplier ready
io.json_file({
	file:__dirname + '/country.json',
	pretty:true
}, function(root_supply_chain){

	// now make our custom warehouse

	// new warehouse pointing to a JSON file
	io.warehouse(function(message, callback){

	// capture full context searches


	})
	.ready(function(warehouse){

		/*
		warehouse('city.cool').each(function(result){
			console.log('' + result);
		})
		*/

		warehouse('fruit', '.food').when(function(result){
			console.log(result.count());
		})

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
