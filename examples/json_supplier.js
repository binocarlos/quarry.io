var io = require('../lib/quarryio');
var async = require('async');

var root_supplier = null;

function supplyChainFactory(type, options, ready_callback){
	if(!io[type]){
		var ret = io.ram();
		ready_callback(ret);
		return ret;
	}
	else{
		return io[type](options, ready_callback);
	}
}

function ensureRootSupplier(ready_callback){
	if(root_supplier){
		ready_callback && ready_callback(root_supplier);
		return;
	}

	supplyChainFactory('json_file', {
		file:__dirname + '/country.json',
		pretty:true
	}, ready_callback);
}

// new warehouse pointing to a JSON file
io.warehouse(function(req, callback){

	// get the root supply chain
	ensureRootSupplier(function(root_supply_chain){


		if(req.action=='contract'){
			
			root_supply_chain({
				action:'select',
				message:{
					selector:req.message.context	
				}
			}, function(error, res){
				var results = io.container(res.results);

				var remaining_ids = [];

				var fanout_functions = [];

				var fanout_results = [];

				results.each(function(child){
					if(child.match('supplier')){
						fanout_functions.push(function(next){

							console.log('-------------------------------------------');
							console.log('-------------------------------------------');
							console.log('Trying 2nd layer');

							supplyChainFactory(child.attr('supply_chain'), child.attr(), function(branch_supply_chain){
								branch_supply_chain({
									action:'select',
									message:{
										selector:req.message.selector
									}
								},function(error, res){
									// we have the raw results
									console.log('-------------------------------------------');
									console.log('-------------------------------------------');
									console.log('HAVE 2nd LAYER RESULTS');
									console.dir(res);
									fanout_results = fanout_results.concat(res.results);
									next();
								})
							})
						})
					}
					else{
						remaining_ids.push(child.quarryid());
					}
				})

				// append the default selector function
				// this is the context ids striped of the suppliers
				fanout_functions.push(function(next){
					root_supply_chain({
						action:'select',
						message:{
							selector:req.message.selector,
							previous:remaining_ids
						}
					},function(error, res){
						fanout_results = fanout_results.concat(res.results);
						next();
					})
				})

				async.parallel(fanout_functions, function(){
					console.log('-------------------------------------------');
					console.log('finished');
					console.dir(fanout_results);
				})

			})
		}
		// this is destined for another supply_chain
		else if(req.pointer){

		}
		// a default one - pipe normally
		else{
			root_supply_chain(req, callback);
		}


	})
	
})
.ready(function(warehouse){

		/*
		warehouse('city.cool').each(function(result){
			console.log('' + result);
		})
		*/

		warehouse('fruit', '.food').when(function(result){
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
