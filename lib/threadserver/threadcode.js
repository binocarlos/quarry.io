var Container = require('/lib/container/proto');

var callbacks = {};

thread.on('response', function onResponse(packet){

	packet = JASON.parse(packet);

	if(!callbacks[packet.id]){
		return;
	}
	
	var callback = callbacks[packet.id];
	callback(packet.res);
	delete(callbacks[packet.id]);
})

thread.on('map', function onMap(packet){

	var self = this;

	packet = JASON.parse(packet);

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

	var basecontainer = Container.new('warehouse').meta({
    quarrysupplier:stackpath,
    supplychainroot:true
  })

	basecontainer.supplychain = supplychain;

	function connect(path){
		var ret = Container.new('warehouse').meta({
	    quarrysupplier:stackpath + path,
	    supplychainroot:true
	  })
	  ret.supplychain = supplychain;
	  return ret;
	}

	var packetid = packet.id;
	var stackpath = packet.stackpaths.api;
	var containers = basecontainer.spawn(packet.input);
	var results = basecontainer.spawn();
	
	var requests = [];
	var branches = [];

	var fn = null;

	try{
		eval('fn = ' + packet.fn_string);
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
	var total = containers.count();

	var context = {
		emit:function(container){
			results.add(container);
		},
		connect:connect
	}

	self.emit('log', 'run function ' + fn.length)

	if(fn.length<=1){
		containers.each(function(container){
			fn.apply(context, [container]);
		})

		sendresults();
	}
	else{
		function done(){
			completed++;
			if(completed>=total){
				sendresults();
			}
		}
		containers.each(function(container){
			fn.apply(context, [container, done]);
		})
	}
	
})