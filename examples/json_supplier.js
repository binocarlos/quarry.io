var io = require('../lib/quarryio');

// new warehouse pointing to a JSON file
io.warehouse(io.json_file({	
	file:__dirname + '/country.json',
	pretty:true
}))
// 
.use('context', function(container, next){

	console.log('-------------------------------------------');
	console.log('context MIDDLEWARE');

	console.dir(container);

	next();
})
.ready(function(warehouse){

	warehouse('city.food').each(function(result){
		console.log('' + result);
	})

	warehouse('area', 'city[name^=b]').when(function(result){
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


