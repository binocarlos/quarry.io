var io = require('../lib/quarryio');

var root_supplier = null;

function ensureRootSupplier(ready_callback){

	if(root_supplier){
		ready_callback && ready_callback(root_supplier);
		return;
	}

	root_supplier = io.json_file({
		file:__dirname + '/country.json',
		pretty:true
	}, ready_callback);
}

// new warehouse pointing to a JSON file
io.warehouse(function(message, callback){

	// get the root supply chain
	ensureRootSupplier(function(root_supply_chain){

		root_supply_chain(message, callback);

		/*
		console.log('have root');
		console.dir(message);

		if(message.action=='contract'){
			root_supply_chain(message, function(error, res){
				console.log('-------------------------------------------');
				console.log('here');
				console.dir(res);
			});
		}
		// this is destined for another supply_chain
		else if(message.pointer){

		}
		// a default one - pipe normally
		else{
			root_supply_chain(message, function(){
				console.log('-------------------------------------------');
				console.log('here');
			});
		}

		*/
	})
	
})
.ready(function(warehouse){

		/*
		warehouse('city.cool').each(function(result){
			console.log('' + result);
		})
		*/

		warehouse('area', '.cool').when(function(result){
			console.log('-------------------------------------------');
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
