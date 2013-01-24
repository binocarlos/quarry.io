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

var _ = require('underscore');
var async = require('async');
var utils = require('../../../utils');
var eyes = require('eyes');
var express = require('express');
var passport = require('passport');
var fs = require('fs');
var queries = require('../../../query/factory');
var providers = {};


_.each(fs.readdirSync(__dirname + '/providers'), function(filename){
  var provider_name = filename.replace(/\.js$/, '');

  providers[provider_name] = require('./providers/' + provider_name);
})

/*

  HTTP AUTH mixin
  
*/
module.exports = function(app, options, callback){
  
  var route = options.route;
  var network_client = app.network_client;

  /*
  
    get a warehouse pointing directly to /auth
    
  */
  network_client.warehouse('/auth', function(warehouse){

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
    function auth(name){

      return function(req, accessToken, refreshToken, profile, done){
        
        /*
        
          we send a POST request to the auth supplier oauth route
          
        */
        var authreq = queries.request({
          method:'post',
          path:'/oauth',
          body:{
            name:name,
            session_user:req.session.user,
            accessToken:accessToken,
            refreshToken:refreshToken,
            profile:profile
          }
        })

        warehouse.request(authreq, function(res){
          console.log('-------------------------------------------');
          console.log('anwer from auth warehouse');
          eyes.inspect(res.toJSON());
        })

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
    function router(name){

      return function(){
        console.log('-------------------------------------------');
        console.log('router');
        process.exit();  
      }
      
    }

    _.each(options.providers, function(config, name){
      console.log('-------------------------------------------');
      console.log('mounting: ' + name);

      providers[name].apply(null, [app, auth(name), router(name), {
        auth:options,
        provider:config
      }])

    })
    
    callback();

  })
}