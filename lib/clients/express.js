
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , socketio = require('socket.io')
  , ejslocals = require('ejs-locals')
  , RedisStore = require('connect-redis')(express)
  , cookie = require('cookie')
  , connectUtils = require('express/node_modules/connect/lib/utils')
  , _ = require('underscore')
  , EventEmitter = require('events').EventEmitter
  , eyes = require('eyes')
  , routes = require('./express/routes')
  , auth_factory = require('./auth');

module.exports = factory;

function factory(options){

  options || (options = {});

  options = _.defaults(options, {
    port:80,
    redis_port:6379,
    redis_host:'127.0.0.1',
    cookie_secret:'rodneybatman',

    favicon:__dirname + '/express/static/favicon.ico',
    document_root:__dirname+'/express/www'
    
    

  });

  function build_server(){

    var app = express()
    , server = http.createServer(app)
    , redisStore = new RedisStore(options.redis_port, options.redis_host)
    io = socketio.listen(server);

    /*
     *
     * Express Config
     *
     */

    app.configure(function(){
      app.set('port', options.port);
      app.engine('ejs', ejslocals);
      app.set('views', __dirname + '/express/views');
      app.set('view engine', 'ejs');
      app.use(express.favicon(options.favicon));
      app.use(express.cookieParser(options.cookie_secret));
      app.use(express.bodyParser());
      app.use(express.session({ store: redisStore }));
      if(options.auth){
        app.use(passport.initialize());
        app.use(passport.session({ store: redisStore }));  
      }
      app.use(app.router);
      //app.use(require('less-middleware')({ src: __dirname + '/www' }));
      
      app.use(express.static(options.document_root));
    });

    app.configure('development', function(){
      app.use(express.errorHandler());
    });

    /*
     *
     * Socket Config
     *
     */

    io.configure(function(){
      io.enable('browser client minification');  // send minified client
      io.enable('browser client etag');          // apply etag caching logic based on version number
      io.enable('browser client gzip');          // gzip the file
      io.set('log level', 5);                    // reduce logging
      io.set('transports', [                     // enable all transports (optional if you want flashsocket)
          'websocket'
        //, 'flashsocket'
        //, 'htmlfile'
        , 'xhr-polling'
        , 'jsonp-polling'
      ]);
    })


    /*
     *
     * Now we inject the auth providers
     *
     */

    var provider_functions = {
      facebook:function(config, callback){
        return new FacebookStrategy(config, callback)
      },
      twitter:function(config, callback){
        return new TwitterStrategy(config, callback)
      }
    }

    if(options.auth){

      var user_warehouse = options.auth_warehouse;
      var auth_client = auth_factory(user_warehouse);

      passport.serializeUser(function(user, done) {
        done(null, user);
      });

      passport.deserializeUser(function(obj, done) {
        done(null, obj);
      });

      _.each(options.auth, function(config, provider_name){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('auth provider: ' + provider_name);

        var auth_callback = function(accessToken, metaToken, profile, done){
          var token = {
            access:accessToken,
            meta:metaToken
          }

          auth_client.ensure_user(provider_name, token, profile, done);
        }

        var connect_callback = function(accessToken, metaToken, profile, done){
          var token = {
            access:accessToken,
            meta:metaToken
          }

          auth_client.ensure_provider(provider_name, token, profile, done);
        }

        var connect_insert_callback = function(req, res){
          auth_client.connect_insert(provider_name, req.user, req.account, function(){
            req.session.save();
            res.redirect('/');
          })

        }

        var auth_options = _.extend({}, config, { 
          callbackURL:'http://' + options.hostname + '/auth/' + provider_name + '/callback'
        })

        var connect_options = _.extend({}, config, {
          callbackURL:'http://' + options.hostname + '/connect/' + provider_name + '/callback'
        })

        var auth_provider = provider_functions[provider_name](auth_options, auth_callback);
        var connect_provider = provider_functions[provider_name](connect_options, connect_callback);

        passport.use(provider_name, auth_provider);
        passport.use(provider_name + '-authz', connect_provider);

        app.get('/auth/' + provider_name, 
          passport.authenticate(provider_name)
        )
        
        app.get('/auth/' + provider_name + '/callback', 
          passport.authenticate(provider_name, {  successRedirect: '/',
                                                  failureRedirect: '/login' })
        )

        app.get('/connect/' + provider_name,
          passport.authorize(provider_name + '-authz', { failureRedirect: '/login' })
        )

        app.get('/connect/' + provider_name + '/callback',
          passport.authorize(provider_name + '-authz', { failureRedirect: '/login' }),
          connect_insert_callback
        )

      })

      // the auth handshake - this relies on the session store
      io.set('authorization', function (data, accept) {
        if (!data.headers.cookie) 
          return accept('No cookie transmitted.', false);

        data.cookie = cookie.parse(data.headers.cookie);

        if (cookie_secret) {
          data.cookie = connectUtils.parseSignedCookies(data.cookie, options.cookie_secret);
        }
        
        data.sessionID = data.cookie['connect.sid'];

        redisStore.load(data.sessionID, function (err, session) {
          if (err || !session) return accept('Error', false);

          data.session = session;
          return accept(null, true);
        });
      })

      app.get('/logout', function(req, res){
        req.logOut();
        res.redirect('/');
      })

      /*
        Flag the session with no more 'connecting' of accounts
       */
      app.get('/usr/start', function(req, res){
        req.user.started = true;
        req.session.save();

        res.json({
          ok:true
        })
      })
    }

    return {
      express:app,
      app:app,
      http:server,
      sockets:io
    }
  }

  /*
   *
   * API
   *
   */

  var quarry_server = {

    /*
      The warehouse used for this server
     */
    warehouse:null,

    /*
      Add a function for the messages coming via the socket
     */
    use:function(assign_warehouse){
      this.warehouse = assign_warehouse;
      return this;
    },

    /*
      Proxy into the build function
     */
    build:function(callback){

      var stack = build_server();
      var self = this;

      var app = stack.app;

      _.extend(stack, EventEmitter);

      stack.supply_chain = null;
      /*
        MESSAGE CALLBACK
       */
      stack.sockets.on('connection', function(socket){

        var session = socket.handshake.session;

        var user = null;

        if(options.auth){
          user = session.passport.user;
        }
        
        socket.on('message:req', function(message_id, packet){
          
          if(!self.warehouse){
            return;
          }

          packet.user = user;

          self.warehouse(packet, function(error, answer_packet){
            delete(answer_packet.user);
            socket.emit('message:rep', message_id, answer_packet);  
          })
        })    

      })

      stack.listen = function(callback){
        stack.http.listen(app.get('port'), function(ready){
          console.log("Quarry Express server listening on port " + app.get('port'));
          ready && ready();
          callback && callback();
        })
      }

      stack.warehouse = function(new_warehouse){
        this.warehouse = new_warehouse;
        return this;
      }

      /*
        Shortcut for rendering a bootstrap page

        Returns middleware for handling the request

       */
      stack.application = function(config){
        config || (config = {})

        return routes.application(config);
      }

      routes.quarry(app);

      callback(stack);
    },

    /*
      Chainable option setter
     */
    option:function(name, val){
      options[name] = val;
      return this;
    },

    auth:function(config, userdb){
      options.auth = config;
      options.auth_warehouse = userdb;
      return this;
    }
  }

  

  return quarry_server;
}








