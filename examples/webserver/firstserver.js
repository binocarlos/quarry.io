var io = require('../../lib/quarryio');
var async = require('async');
var eyes = require('eyes');
var config = require('./config.json');
var express = require('express');

config.document_root = __dirname + '/www';

/*
  Routes to system resources
 */
var special_routes = {
  'quarry.blueprints':{
    driver:'json_file',
    pretty:true,
    file:__dirname + '/blueprints.json'
  }
}

/*
  Resource router - chooses where to route packets based on the route
  given
 */
var warehouse = io.warehouse(function(route, packet, callback){

  // we must have a login for them to get access to a warehouse
  if(!packet.user){
    // send back an empty supply chain
    callback('no user present');
    return;
  }

  // this is the special router so we can ask the system about stuff
  // this can NEVER be written to here ('because it's only for select messages)
  if(special_routes[route]){

    console.log('GETTING SPECIAL ROUTE!!!');
    route = special_routes[route];

  }
  else{

    // load the project from the session - this will tell us the route
    var user = packet.user;

    var current_project = user.projects[user.current_project_index];

    var default_route = current_project ? current_project.route : null;

    // the project should tell us a route but this is the uber-default
    if(!default_route){
      default_route = {
        driver:'quarrydb',
        collection:'root_' + packet.user.id
      }
    }

    route = route ? (route!='root' ? route : default_route) : default_route;
  }
    
  var driver = route.driver;

  io[driver] && io[driver](route, callback);  
})

/*
  the users database
  this is a quarrydb
  it is kept seperate from the other databases
 */
var userdb = io.supplier(io.quarrydb({
  collection:'testusers'
}))

/*
  The config for the web server
 */
var server_settings = {
  hostname:'dev2.jquarry.com',
  document_root:__dirname + '/www'
}

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
var server = io.webserver(server_settings);

/*
  Before we build the express server we want to give it some authentication settings
  We provide it with a Quarry DB as it's user database
  The user database can be any supply chain that saves    
*/
server.auth(auth_settings, userdb);

/*
  Now we build the server - it produces a stack which has express, socketio and the raw http server
  we can now add our main data warehouse via 'use'
  then we can 'listen' and we are up!
*/
server.build(function(stack){
  
  var app = stack.app;
  var http = stack.http;
  var sockets = stack.sockets;

  /*
    We can now do anything an express application can do
   */
  app.get('/', function(req, res){
    res.send('user = ' + JSON.stringify(req.user, null, 4));
  })
  
  app.get('/digger', stack.application({
    name:'digger',
    route:'/digger',
    title:'Digger',

  }))

  /*
    the stack is ready for a warehouse
    this will get all messages coming down the socket
    it needs to route those messages to the correct supply chains
   */
  stack
    // pass the warehouse
    .warehouse(warehouse)
    // finally trigger a listen and we are live
    .listen(function(){
      console.log('all listening');
    });
})