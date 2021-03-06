/*

  skeleton network config
  
*/
module.exports = {
  name:"quarry.io Network",
  comment:"The first network ting",
  flavour:'development',
  stackfolders:[],
  systemhome:'/tmp/quarry',
  systemfolders:[
    'build',
    'run',
    'deployment'
  ],
  httpport:17778,
  /*
  
    the core servers used on database nodes
    
  */
  servers:{
    hq:{
      hostname:'127.0.0.1'
    },
    redis:{
      hostname:"127.0.0.1",
      port:6379
    },
    mongo:{
      hostname:"127.0.0.1",
      port:27017
    }
  },
  /*
  
    the overrides into the core config for the different flavours
    
  */
  flavours:{
    development:{
      reset:true
    },
    local:{
      reset:false
    },
    cloud:{
      reset:false
    }  
  },

  /*
  
    how the workers behave
    
  */
  janitorconfig:{
    heartbeat:{
      // heatbeat every second
      delay:1000
    },
    monitor:{
      // monitor every 5 seconds
      delay: 5000,
      freemem: 250000000,
      critical1: 0.7,
      critical5: 0.7,
      critical15: 0.7
    }
  },

  /*
  
    how the workers behave
    
  */
  workerconfig:{
    heartbeat:{
      // heatbeat every second
      delay:1000
    }
  }
}