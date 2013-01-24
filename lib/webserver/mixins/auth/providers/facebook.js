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
var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy;

/*

  Facebook auth strategy
  
*/
module.exports = function(app, fn, options){
  

  var route = options.route;
  var network_client = app.network_client;

  passport.use(new FacebookStrategy({
    clientID: options.provider.key,
    clientSecret: options.provider.secret,
    callbackURL: "http://" + options.auth.hostname + options.auth.route + "/facebook/callback",
    passReqToCallback: true
  }, fn))

/*

  e.g. fn

  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(..., function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }

 */

  

  console.log('-------------------------------------------');
  console.log('mounting auth');
  eyes.inspect(options);
  
  callback();
}