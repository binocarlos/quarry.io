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

var Container = require('../../../container');

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

  _.each(['mount', 'quarryroutes', 'httproutes', 'providers'], function(prop){
    if(!options[prop]){
      throw new Error('auth middleware requires ' + prop + ' in the options');
    }
  })

  var middleware = {
    configure:function(app){
      log.info(dye.yellow('Auth MIddleware config'));
      
      app.use(passport.initialize());
      app.use(passport.session({ store: app.get('sessionStore') }));      

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

        var cacheclient = system.cache;
        var cache = cacheclient.createCache(system.id + ':users');

        cache.set(user.meta.quarryid, JSON.stringify(user), function(error){
          if(!error){
            done(null, user.meta.quarryid);
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

        var cacheclient = system.cache;
        var cache = cacheclient.createCache(system.id + ':users');

        cache.get(id, function(error, userstring){
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

        /*
        
          this is the user we manifest as when we speak to the user database

          it is up to whatever database we are speaking to to configure write
          access for quarryagent.authapi
          
        */
        var authuseragent = Container.new('quarryagent').addClass('authapi').toJSON()[0];
        
        return function(req, accessToken, refreshToken, rawprofile, done){

          rawprofile.provider = name;
          rawprofile.accessTokens = {
            access:accessToken,
            refresh:refreshToken
          }

          /*
          
            called once we have setup the database

            this is what we emit to the mapper to choose what is exposed to the requests
            
          */
          function loaduser(id){

            db('user=' + id + ':tree')
              .setHeader('x-json-quarry-user', authuseragent)
              .ship(function(user){

                var rawuser = user.clone();

                rawuser.find('profile').each(function(profile){
                  profile.removeAttr(['_json', '_raw', 'accessTokens']);
                })

                done(null, rawuser.toJSON()[0]);
              })
          }

          db('profile.' + name + '#' + rawprofile.id)
            .setHeader('x-json-quarry-user', authuseragent)
            .ship(function(profile){

              /*

                if we did not find the user it might be:

                  a) they are not logged in but have a record
                  b) they are logged in but not with this provider
                  c) thay are not logged in at all
                
              */
              if(profile.count()<=0){

                var profile = Container.new('profile', rawprofile);
                profile.addClass(name).id('' + rawprofile.id);

                providers[name].map(profile);

                /*
                
                  there is an already logged in user so this is a connection to a provider for that account
                  
                */
                if(req.user){

                  /*
                  
                    load the database user
                    
                  */
                  db('user=' + req.user.id)
                    .setHeader('x-json-quarry-user', authuseragent)
                    .ship(function(user){

                      if(user.count()<=0){
                        var user = Container.new('user', {
                          name:profile.attr('displayName')
                        })

                        user.append(profile);

                        db.append(user).ship(function(){
                          loaduser(user.quarryid());
                        })
                      }
                      else{
                        user.append(profile).ship(function(){
                          loaduser(user.quarryid());
                        })  
                      }
                      
                    })
                  


                }
                /*
                
                  this is a brand new user
                  
                */
                else{

                  var user = Container.new('user', {
                    name:profile.attr('displayName')
                  })

                  user.append(profile);

                  db.append(user)
                    .setHeader('x-json-quarry-user', authuseragent)
                    .ship(function(){
                      loaduser(user.quarryid());
                    })

                }
              }
              /*
              
                this means they have visited before!
                
              */
              else{

                profile.attr(rawprofile)
                providers[name].map(profile);
                profile.save()
                  .setHeader('x-json-quarry-user', authuseragent)
                  .ship(function(){

                    profile('< user').ship(function(user){
                      loaduser(user.quarryid());
                    })  
                  })

              }

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

        return function(req, res){
          console.log('-------------------------------------------');
          console.log('router in auth index: this is where to decide to redirect after auth');
          process.exit();  
        }
        
      }

      /*
      
        get a connection to the root warehouse
        
      */
      var db = system.supplychain.connect(dbroute);
      
      _.each(options.providers, function(providerconfig, name){
        log.info(dye.yellow('Auth MIddleware mount: ') + ' - ' + dye.red(name));
        
        providers[name].apply(null, [app, auth(db, name), router(db, name), {
          mount:options.mount,
          routes:_.extend({}, options.httproutes, {
            hostname:app.options.hostnames[0]
          }),
          provider:providerconfig
        }])

      })

      app.get(options.mount + '/logout', function(req, res, next){
        req.session.destroy();
        req.logout();
        res.redirect('/');
      })

      callback();
    }
  }

  return middleware;
}