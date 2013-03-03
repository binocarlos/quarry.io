/*
      
        this we announce to the back socket as to our stack route
        
      */
      var stackpath = node.attr('stackpath') || '';

 
      /*
      
        connect the backend reception socket to the JSON RPC
        
      */
      var httpserver = self.httpserver;

      /*
      
        we pass this into the api handlers so they have access to the system tings
        
      */
      var system = {
        id:worker.stackid,
        cache:self.cache,
        worker:worker
      }

      //rpcserver.on('message', supplychain.handle);

      /*
      
        now build up each service
        
      */

      async.forEach(node.find('service').containers(), function(service, nextservice){

        var module = service.attr('module');
        var route = service.attr('mount');

        /*
        
          this will become the Quarry handler
          
        */
        var moduleoptions = _.extend({}, service.attr(), {
          stackpath:stackpath,
          route:route
        })


        /*
        
          is it a custom module
          
        */
        if(!module.match(/^quarry\./)){

          throw new Error('unknown fileserver module: ' + module);

        }

        _.each(moduleoptions, function(val, prop){
          if(val.indexOf('__stack.')==0){
            moduleoptions[prop] = system.worker.stack[val.substr('__stack.'.length)];
          }
        })

        var fn = FileServerFactory(module, moduleoptions, system);
        

        /*
        
          mount the quarryfn on the supply chain
          
        */        
        httpserver.use(route, fn);

        nextservice();

      }, next)
      
    },

    function(next){
      self.httpserver.bind(next);
    }