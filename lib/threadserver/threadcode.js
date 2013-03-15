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

function getcontainer(project, path){

	var self = thread;

	path || (path = '/');

	var stackroute = project[path] || "/";

 	function supplychain(req, res, next){

		var id = req.getHeader('x-contract-id');

		callbacks[id] = function(respacket){
			res.fill(respacket);	
		}

		self.emit('request', JASON.stringify({
			id:id,
			routingpacket:req.routingpacket(),
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
  retcontainer.connect = function(projectpath){

  	return getcontainer(project, projectpath);

  }

  return retcontainer;
}

function script(packet){

	var self = this;

	packet = JASON.parse(packet);

	var packetid = packet.id;
	var project = packet.project;

	var container = getcontainer(project);

	var req = Container.request(packet.req);
	var res = Container.response(function(){
		self.emit('result', JASON.stringify({
	  	id:packet.id,
	  	res:res.toJSON()
	  }))
	})

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

	fn(req, res, function(){
		res.send404();
	})
	
}

function map(packet){

	var self = this;

	thread.emit('log', 'running map');

	packet = JASON.parse(packet);

	var packetid = packet.id;
	var project = packet.project;

	var container = getcontainer(project);
	
	var results = container.spawn();	
	var input = container.spawn(packet.input);

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
	  	results:results.toJSON()
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
		thread.emit('log', 'running single arity');
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
		thread.emit('log', 'running double arity');
		input.each(function(container){
			thread.emit('log', 'running container: ' + container.summary());
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

thread.on('script', function(packet){
	try{
		script.apply(this, [packet]);	
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