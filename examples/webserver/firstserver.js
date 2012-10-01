var io = require('../../lib/quarryio');
var async = require('async');
var eyes = require('eyes');
var config = require('./config.json');

config.document_root = __dirname + '/www';

var warehouse = function(packet, callback){

  console.log('message');
  eyes.inspect(packet);
}

/*
  the users database
  this is a quarrydb
  it is kept seperate from the other databases
 */
var userdb = io.supplier(io.quarrydb({
  collection:'testusers'
}))

/*
  The API keys of the providers we want to allow a login for
 */
var auth_settings = {
  "facebook":{
      "clientID":"235139659919776",
      "clientSecret":"560bdc68d3d03020c709785ec0381a54"
    },
    "twitter":{
      "consumerKey":"mienJfG4zeERhg8zZIvvg",
      "consumerSecret":"5z4E48dOVUWv6IuuWwOdsdyew9yuD2XLNsTZG1UcYw"
    }
}

/*
  Make a new express server
  You give a document root - it looks after delivering socket.io
 */
io.webserver({
  hostname:'dev2.jquarry.com',
  document_root:__dirname + '/www'
})
/*
  Before we build the express server we want to give it some authentication settings
  We provide it with a Quarry DB as it's user database
  The user database can be any supply chain that saves    
*/
.auth(auth_settings, userdb)
/*
  Now we build the server - it produces a stack which has express, socketio and the raw http server
  we can now add our main data warehouse via 'use'
  then we can 'listen' and we are up!
*/
.build(function(stack){
  var app = stack.express;
  var http = stack.http;
  var sockets = stack.sockets;

  /*
    We can now do anything an express application can do
   */
  app.get('/', function(req, res){
    res.send(JSON.stringify(req.user, null, 4));
  })

  /*
    the stack is ready for a warehouse
    this will get all messages coming down the socket
    it needs to route those messages to the correct supply chains
   */
  stack
    // pass the warehouse
    .use(warehouse)
    // finally trigger a listen and we are live
    .listen(function(){
      console.log('all listening');
    });
})