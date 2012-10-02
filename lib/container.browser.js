var container = require('./container');

// Global expose of the browserified container.js
(function(window) {

	var _ = container.api._;
	var async = container.api.async;


	/*
		This is injected by the server and gives us access to anything in that world we should see

	 */	
	var server_config = window._$quarry_config;

	var user = server_config.user;
	var production = server_config.production;
	var hostname = server_config.hostname;
	var auth_providers = server_config.auth_providers;
	/*
		The front end browser supply chain - proxies messages via the socket back to the server

	 */
	function supply_chain_factory(){

		// we assum the server has exposed an io object for the sockets
		var socket = io.connect('//' + hostname);

	  // we keep track of our own callbacks by id
	  var message_id = 0;
	  var rep_callbacks = {};

	  socket.on('message:rep', function(message_id, packet){
	    var callback = rep_callbacks[message_id];

	    if(!callback){
	      console.log('-------------------------------------------');
	      console.log('-------------------------------------------');
	      console.log('FATAL ERROR - NO CALLBACK FOUND FOR MESSAGE: ' + message_id);
	      throw new Error('no callback found');
	    }

	    if(!production){
	    	console.log(packet);	
	    }
	    

	    callback(null, packet);
	  })

	  return function(packet, callback){

	    message_id++;
	    rep_callbacks[message_id] = callback;

	    if(!production){
	    	console.log('-------------------------------------------');
		    console.log('-------------------------------------------');
		    console.log(packet);
	    }
	    
	    socket.emit('message:req', message_id, packet);

	    return this;
	  }
	}

	/*
		the array of ready functions to run - $quarry(function(){ ... })
	 */
	// 
	var ready_callbacks = [];

	/*
		The main quarry config

			production - development or live mode
			hostname - the HTTP host - the server sets this so we can load back from source
	 */

	var config = {};

	/*
    The root supply chain - this kicks off socket.io back to the server
   */

  var supply_chain = supply_chain_factory();

  /*
    The root warehouse is a container with the root supply chain
   */

  var warehouse = container(supply_chain);
  warehouse.quarryid('root');;  

	/*
		The global quarry object - this is exposed to the browser and accepts a ready callback jQuery style
	 */

	function $quarry(ready_callback){
		ready_callback && ready_callback(warehouse);
		return this;
	}

	$quarry.new = container;
	
	$quarry.configure = function(new_config){
		_.extend(config, new_config);
		return this;
	}

	$quarry._server_config = server_config;

	$quarry.ready = function(ready_callback){
		ready_callback && ready_callback(warehouse);
		return this;
	}

	/*
    access to the server props
   */
   
	$quarry.user = server_config.user;

	/*
    clone the warehouse and set the route to point elsewhere
    this is used to point @ system quarries
   */
  $quarry.route = function(route){
    // make a cloned version pointing to the same supply chain
    var newwarehouse = container(supply_chain);

    // reroute it to the top
    newwarehouse.route(route);
    newwarehouse.root(true);

    return newwarehouse;
  }

  $quarry.user = function(){
  	return user;
  }

  $quarry.hostname = function(){
  	return hostname;
  }

  $quarry.production = function(){
  	return production;
  }

  $quarry.auth_providers = function(){
  	return auth_providers;
  }

  $quarry.server_config = function(){
  	return server_config;
  }

	/*
    Expose all of the code inside of the container.api
   */
  //_.extend($quarry, container.api);

  _.each(container.api, function(obj, name){
  	$quarry[name] = obj;
  })

  window.quarryio = $quarry;
	window.$quarry = $quarry;

})(window);