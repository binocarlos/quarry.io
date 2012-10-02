var express = require('express'),
    cabinet = require('cabinet'),
    _ = require('underscore');



/*
  The core API routes for serving the container.browser.js and socket.io
 */
module.exports.quarry = function(app) {
  
  /*
    Expands into:

      /socket.io/socket.io.js (dealt with by socket.io)

      /quarry.io.container.js (below)
   */

  app.get('/quarry.io.js', function(req, res){
    res.render('boot', {
      hostname:req.host,
      user:req.user,
      production:process.env.NODE_ENV=='production'
    })
  })

  /*
    the browserified version of the container.browser
   */
  app.get('/quarry.io.container.js', function(req, res){
    var document_root = __dirname + '/../../'

    res.sendfile('container.browser.built.js', {
      root:document_root
    })
  })

  

  /*
    the various static files
   */

  var static_root = __dirname + '/static';

  app.use('/quarry.io/static', cabinet(static_root, {
    coffee:false,
    gzip:true,
    
    // Set LESS CSS options
    less:{
      // Specify search paths for @import directives
      paths: ['.',static_root + '/libs'], 
    },
    
      // Activates in-memory cache
    cache:{ 
      maxSize: 1024, 
      maxObjects:256
    }
  }))


//    res.sendfile(file);
}

/*
  Renders a Twitter Bootstrap page wrapper based on the given config

  acts as middleware
 */
module.exports.application = function(options){

  options || (options = {})

  _.defaults(options, {
    name:'digger',
    title:'Digger',
    route:'/digger',
    production:process.env.NODE_ENV=='production'
  })

  return function(req, res){

    var params = _.clone(options);
    params.hostname = req.host;
    params.user = req.user;

    res.render('applications/' + options.name, params);
  }

}