/*
  Copyright (c) 2012 All contributors as noted in the AUTHORS file

  This file is part of quarry.io

  quarry.io is free software; you can redistribute it and/or modify it under
  the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version.

  quarry.io is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Module dependencies.
*/

var socketio = require('socket.io');
var express = require('express');
var http = require('http');

/*
  Quarry.io Web
  -------------

  Tools for mounting a supply chain onto a URL of an express application

  The URL that is mounted can then be pointed to <script src="/url" /> style

  The page can then use $quarry('selector').when(function(){ ... })



 */

// this will register quarry.io on /quarry.io/ (or the alternative in the options)
// the public URL then provies a map for JSON queries on the given supply_chain
// a sub-express application (ignoring how the original app is setup) is created for the routing
module.exports.listen = function(http_server, main_express, supply_chain, options){
	
	options = parse_options(options);

	var route = options.route;

	var app = build_express(route, main_express);
	var io = build_io(route, http_server);

	return factory(app, io, options);
}

// this is where it builds an entire application fresh from the top level
module.exports.build = function(supply_chain, options){

	options = parse_options(options);

	var route = options.route;

	var app = build_express(route);
	var http_server = http.createServer(app);
	var io = build_io(route, http_server);

	return factory(app, io, options);
}

// we return a nice wrapper
function factory(app, io, options){

	function web(){}

	web.app = app;
	web.io = io;
	web.options = options;

	return web;
}

function parse_options(options){
	options || (options = {});

	options = _.defaults(options, {
		route:'/quarry.io'
	})

	return options;
}

function build_io(route, http_server){

	var io = socketio.listen(http_server);

	io.configure( function(){
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
    io.set('log level', 3);                    // reduce logging
    io.set('resource', route + '/socket.io');	 // change route for quarry (allows main express to have it's own sockets)
    io.set('transports', [                     // enable all transports (optional if you want flashsocket)
        'websocket'
      //, 'flashsocket'
      //, 'htmlfile'
      , 'xhr-polling'
      , 'jsonp-polling'
    ])
  })

  return io;
}

function build_express(route, main_express){
	//Setup Express
  var app = express();

  app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.query());

    app.set('views', __dirname+'/views');
	  app.set('view engine', 'ejs');
	  app.set('view options', {
			layout:false
	  });

	  // where are we actually serving from?
	  app.use(express.static(__dirname+'/www'));

  })

  main_express ? main_express.use(route, app) : null;

  return app;
}




// the port (like 80 for default production and document_root like default /srv/camelot/webserver/www)
module.exports = function(document_root){

	// this is passed in from the bootloader - there may be several severs pointing to different client folders (as in staging trim)
	document_root = document_root ? document_root : __dirname+'/www';
	
	tools.log('admin', 'Web Server document_root: ' + document_root);

	// create a spanking brand new Express App
	// it will save Sessions into Redis and so will survive a crash/restart
	var app = expressHelper({
		redissession:true
	});

	var server = http.createServer(app);

	// the socket.io
	var io = null;



	/*


		CONFIG






	 */

	// we configure our View engine - this is how we write session data into the editor HTML
	// (like the user that is logged in and any account preferences)
	//
	// This is saved 'somewhere' eventually but transiently in Redis in the session
	app.configure(function(){

		app.set('views', __dirname+'/views');
	  app.set('view engine', 'ejs');
	  app.set('view options', {
			layout:false
	  });

	  // where are we actually serving from?
	  app.use(express.static(document_root));

	  app.use(app.router);

	  // we want socket.io on this server
    io = socketio.listen(server);

    io.configure( function(){
      io.enable('browser client minification');  // send minified client
      io.enable('browser client etag');          // apply etag caching logic based on version number
      io.enable('browser client gzip');          // gzip the file
      io.set('log level', 1);                    // reduce logging
      io.set('transports', [                     // enable all transports (optional if you want flashsocket)
          'websocket'
        //, 'flashsocket'
        //, 'htmlfile'
        , 'xhr-polling'
        , 'jsonp-polling'
      ]);
    });
	});



	/*


		AJAX






	 */


	// a helper function to return the current user status as an object
	var loginStatus = function(session){
		var ret = {
			status:false
		};

		if(session && session.auth){
			ret = {
				status:true,
				user_id:session.user_id,
				nickname:session.nickname,
				document_name:session.document_name,
				page_id:session.page_id
			}
		}

		return ret;
	}

	/*
		The client is asking whether the user is logged in
	 */
	app.get('/usr/status', function(req, res){
		res.json(loginStatus(req.session));
	})

	

	/*
		Login the user - save the nickname to the session
	 */
	app.get('/usr/auth', function(req, res){
		var session = req.session;
		var nickname = req.query.nickname || '';

		if(nickname.match(/\w/)){
			session.auth = true;
			session.nickname = nickname;
			session.user_id = tools.guid();	
			session.save();
		}
		else{
			session.destroy();
		}
		
		res.json(loginStatus(session));
	})


	/*

			DOCUMENTS
	

	 */ 

	/*
		Return an array of the documents we have
	 */
	app.get('/usr/list_documents', function(req, res){
		tools.listXarDocuments(function(error, documents){
			res.json(documents);
		});
	})

	/*
		Load the data for a document - this goes in tandem with registering it with the socket
	 */
	app.get('/usr/load_document', function(req, res){
		var session = req.session;
		var document_name = req.query.document_name || '';

		if(document_name.match(/\.xar$/i)){
			session.document_name = document_name;
			session.save();
		}
		
		// connect to the document server and ask for the data
		//res.json(loginStatus(session));

		server.emit('camelotmessage', {
			action:'load',
			document_name:document_name
		}, function(error, results){

			// this sets the image folder to point into the fixtures if we are running in DEV mode
			results.imageFolderName = process.env.NODE_ENV=='development' ? document_name.replace(/\.xar$/, '') + '/images' : results.imageFolderName;

			res.json({
				error:error,
				results:results
			})
		})
	})

	/*
		Single page data load
	 */
	app.get('/usr/load_page', function(req, res){
		var session = req.session;
		var page_id = req.query.page_id || '';

		session.page_id = page_id;
		session.save();
		
		// connect to the document server and ask for the data
		//res.json(loginStatus(session));

		server.emit('camelotmessage', {
			action:'page',
			document_name:session.document_name,
			page_id:session.page_id
		}, function(error, results){

			res.json({
				error:error,
				results:results
			})
		})
	})


	/*
		Destroy the session
	 */
	app.get('/usr/logout', function(req, res){
		req.session.destroy();
		res.json(loginStatus());
	})




	/*


		SOCKETS






	 */


	io.sockets.on('connection', function (socket) {

		var currentDocument = null;

		// we use this as the shallow pub/sub queue
		socket.on('register_document', function(data){

			currentDocument = data.document_name;
			// join the document - this is like a 'room' to socket.io
			socket.join(currentDocument);

		})

		// this is basically our user:left event
		socket.on('disconnect', function(){
			socket.leave(currentDocument);
		})

		// THIS IS THE PUB/SUB - this will be replaced by ZeroMQ when we scale
		socket.on('shallow_message_in', function(message){
			io.sockets.in(currentDocument).emit('shallow_message_out', message);
		})

		socket.on('deep_message_in', function(message){

			server.emit('camelotmessage', {
				action:'operation',
				document_name:currentDocument,
				data:message
			}, function(error, results){

				io.sockets.in(currentDocument).emit('deep_message_out', results);
				
			})

		})

	})

	/*


		CAMELOT IMAGES






	 */

	/*
		So we can server the image files
		If we are on dev trim we point into the fixtures folder
	 */
	app.use('/camelot_images', express.static(process.env.NODE_ENV=='development' ? __dirname + '/../documentserver/fixtures/dump/' : config.image_folder));



	/*


		DOCS






	 */

	/*
	 	inject converted .md file into the docs.ejs view and render
	 */
	var renderMarkdownFile = function(page, req, res){
		var markdown_file_path = __dirname + '/../docs/' + page + '.md';

		// convert the raw Markdown into HTML
		tools.convertMarkdownFile(markdown_file_path, function(error, html){

			res.render('docs', {
				session:req.session,
				markdown_html:error ? error : html
			})
		});
	}

	/*
		The docs homepage
	 */
	app.get('/docs', function(req, res){
		renderMarkdownFile('index', req, res);
	})

	/*
		A single docs page - /docs/network is the URL
		Open the .md file - convert it and pass it to the view
	 */
	app.get('/docs/:page', function(req, res){
		renderMarkdownFile(req.param('page'), req, res);
	})




	return server;
}