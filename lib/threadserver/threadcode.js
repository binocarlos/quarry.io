var Container = require('/lib/container/proto');

var callbacks = {};

function handle_response(packet){
	var self = this;

	packet = JASON.parse(packet);

	if(!callbacks[packet.id]){
		return;
	}
	
	var callback = callbacks[packet.id];
	callback(packet.res);
	delete(callbacks[packet.id]);
}

function getcontainer(packet, route){

	var self = thread;

	route || (route = '/');

	var projectroutes = packet.projectroutes;
  var stackroute = projectroutes[route];

  if(!stackroute){
  	stackroute = projectroutes["/"];
  }

 	function supplychain(req, res, next){

		var id = req.getHeader('x-contract-id');

		callbacks[id] = function(packet){
			res.fill(packet);	
		}

		self.emit('request', JASON.stringify({
			id:id,
			req:req.toJSON()
		}))
	}

  var containerdata = [{
    attr:{
      name:'Project Root'
    },
    meta:{
      tagname:'project',
      quarrysupplier:stackroute,
      supplychainroot:true
    }
  }]

	var retcontainer = Container.factory(containerdata);

  /*

    merge the switchboard into the supplychain and provide it
    to the container
    
  */
  
  retcontainer.supplychain = supplychain;

  /*

    a recursive connection so we can dig down the tree in the form of clients
    
  */
  retcontainer.connect = function(subpath, callback){

  	var ret = getcontainer(packet, subpath);
  	callback && callback(ret);
  	return ret;

  }

  return retcontainer;
}

function map(packet){

	var self = this;

	self.emit('log', 'INSIDE THEAD')

	packet = JASON.parse(packet);

	var packetid = packet.id;

	var container = getcontainer(packet);
	var results = container.spawn();	
	var input = container.spawn(packet.input);

	var requests = [];
	var branches = [];

	var fn = null;

	try{
		eval('fn = ' + packet.fn);
	}
	catch(e){
		self.emit('result', JASON.stringify({
			id:packet.id,
			error:e
		}))
		return;
	}
	
	function sendresults(){
		self.emit('result', JASON.stringify({
	  	id:packet.id,
	  	results:results.toJSON(),
	  	requests:requests,
	  	branches:branches
	  }))
	}

	var completed = 0;
	var total = input.count();

	var mapper = {
		connect:container.connect,
		emit:function(result){
			results.add(result);
		},
		done:function(){
			completed++;
			if(completed>=total){
				sendresults();
			}
		}
	}

	self.emit('log', 'run function ' + fn.length)

	/*
	
		we are running in sync mode
		
	*/
	if(fn.length<=1){
		input.each(function(container){
			var result = fn.apply(mapper, [container]);
			mapper.emit(result || container);
			mapper.done();
		})
	}
	/*
	
		this is async mode
		
	*/
	else{
		input.each(function(container){
			fn.apply(mapper, [container, mapper]);
		})
	}
	
}

thread.on('map', function(packet){
	try{
		map.apply(this, [packet]);	
	}
	catch(e){
		this.emit('error', e);
	}
	
})

thread.on('response', function(packet){
	try{
		handle_response.apply(this, [packet]);	
	}
	catch(e){
		this.emit('error', e);
	}
})