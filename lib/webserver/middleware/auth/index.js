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

var _ = require('lodash');
var async = require('async');
var eyes = require('eyes');
var express = require('express');
var passport = require('passport');
var fs = require('fs');
var log = require('logule').init(module, 'Auth Middleware');
var dye = require('dye');

var RedisStore = require('../../tools/redisstore')(express);
var providers = {};

_.each(fs.readdirSync(__dirname + '/providers'), function(filename){
  var provider_name = filename.replace(/\.js$/, '');

  providers[provider_name] = require('./providers/' + provider_name);
})

/*

  quarry.io - auth middleware

  mounts routes onto a website that enable OAUTH and normal authentications
  
*/


module.exports = function(options, system){

  options || (options = {});

  _.each(['mount', 'quarryroutes', 'httproutes', 'providers', 'cookie'], function(prop){
    if(!options[prop]){
      throw new Error('auth middleware requires ' + prop + ' in the options');
    }
  })

  var middleware = {
    configure:function(app){
      log.info(dye.yellow('Auth MIddleware config'));
      var cookieParser = express.cookieParser(options.cookie.secret || 'rodneybatman');
      var sessionStore = new RedisStore(system.worker.cache);

      app.use(cookieParser);
      app.use(express.session({ 
        store: sessionStore,
        secret: options.cookie.cookie_secret
      }))
      app.use(passport.initialize());
      app.use(passport.session({ store: sessionStore }));
    },
    mount:function(app, callback){
      
      /*
      
        the base route for the passport auth fn's
        
      */
      var route = options.mount;

      var dbroute = options.quarryroutes.db;
      var maproute = options.quarryroutes.map;

      /*
      
        only save the id of the user into the browser cookie
        
      */
      passport.serializeUser(function(user, done) {

        var cache = system.cache;

        cache.set(system.id + ':user:' + user.id, JSON.stringify(user), function(error){
          if(!error){
            done(null, user.id);
          }
          else{
            done(error);
          }
        })

      })

      /*
      
        load the full user from redis based on the cookie id
        
      */
      passport.deserializeUser(function(id, done) {
        var cache = system.cache;

        cache.get(system.id + ':user:' + id, function(error, userstring){
          if(!error){
            userstring || (userstring = '{}');
            var user = JSON.parse(userstring);

            done(null, user);
          }
        })
      })

      /*
        
        connect to the auth supplier and login the user

        e.g. fn

        function(accessToken, refreshToken, profile, done) {
          User.findOrCreate(..., function(err, user) {
            if (err) { return done(err); }
            done(null, user);
          });
        }
        
      */
      function auth(db, name){

        return function(req, accessToken, refreshToken, profile, done){

          db('profile.' + name + '#' + profile.id + ' < user')
            .debug(true)
            .ship(function(user){
              console.log('-------------------------------------------');
              eyes.inspect(user.toJSON());
              process.exit();
            })


          /*
          
            we send a POST request to the auth supplier oauth route
            
          
          var authreq = queries.request({
            method:'post',
            path:'/oauth',
            body:{
              name:name,
              session_user:req.user,
              accessToken:accessToken,
              refreshToken:refreshToken,
              profile:profile
            }
          })
          */

        }
      }

      /*
      
        after authentication - where should we redirect the request

        e.g. fn

        function(err, user, info) {
          if (err) { return next(err); }
          if (!user) { return res.redirect('/login'); }
          req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.redirect('/users/' + user.username);
          });
        }
        
      */
      function router(db, name){

        return function(){
          console.log('-------------------------------------------');
          console.log('router');
          process.exit();  
        }
        
      }

      /*
      
        get a connection to the root warehouse
        
      */
      system.supplychain.connect(function(warehouse){

        /*
        
          now a database connection for the queries
          
        */
        warehouse.connect(dbroute, function(db){


          _.each(options.providers, function(providerconfig, name){
            log.info(dye.yellow('Auth MIddleware mount: ') + ' - ' + dye.red(name));
            
            providers[name].apply(null, [app, auth(db, name), router(db, name), {
              mount:options.mount,
              routes:options.httproutes,
              provider:providerconfig
            }])

          })

          app.get(options.mount + '/logout', function(req, res, next){
            req.session.destroy();
            req.logout();
            res.redirect('/');
          })

          callback();
        })

      })

    }
  }

  return middleware;
}