thread.on('map', function onMap(packet){

	var self = this;

	packet = JASON.parse(packet);

	var data = packet.input;
	var results = [];
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
	
	
	var context = {
		emit:function(container){
			results.push(container);
		},
		branch:function(req){
			branches.push(req);
		},
		request:function(req){
			requests.push(req);
		}
	}

	for(var i=0; i<data.length; i++){
		var container = data[i];

		fn.apply(context, [container]);
	}

  this.emit('result', JASON.stringify({
  	id:packet.id,
  	results:results,
  	requests:requests,
  	branches:branches
  }))
})