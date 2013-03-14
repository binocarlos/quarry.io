/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */


var utils = require('../../utils')
  , eyes = require('eyes')
  , _ = require('lodash');

var Container = require('../../container');
var Warehouse = require('../../warehouse');

/*

  Quarry.io - Security Supplier
  -----------------------------

  a wrapper for a QuarryDB that runs a much reduced API
  
*/

module.exports = function(options, network){

  var warehouse = Warehouse();

  /*
  
    create a QuarryDB supplier to save our users inside of
    
  */
  var receptionfront = network.receptionfront;
  var db = receptionfront.connect(options.user_warehouse);

  /*
  
    provider authentication packets have the profile as returned by passport
    
  */
  warehouse.post('/provider/login', function(req, res, next){

    var packet = req.body;

    var rawprofile = packet.profile;
    var name = packet.provider;
    var existinguser = packet.user;

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    eyes.inspect(existinguser);

    /*
  
      called once we have setup the database

      this is what we emit to the mapper to choose what is exposed to the requests
      
    */
    function senduser(id){

      db('user=' + id + ':tree').ship(function(user){

        var rawuser = user.clone();

        rawuser.find('profile').each(function(profile){
          profile.removeAttr(['_json', '_raw', 'accessTokens']);
        })

        res.send(rawuser.toJSON()[0]);
      })
    }
    
    /*
    
      lets see if we have this profile in the database
      
    */
    db('profile.' + name + '#' + rawprofile.id).ship(function(profile){
        
      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('After profile load');
      eyes.inspect(profile.toJSON());
      /*

        if we did not find the user it might be:

          a) they are not logged in but have a record
          b) they are logged in but not with this provider
          c) thay are not logged in at all
        
      */
      if(profile.count()<=0){

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('NO PROFILE FOUND');

        var profile = Container.new('profile', rawprofile);
        profile.addClass(name).id('' + rawprofile.id);

        /*
        
          there is an already logged in user so this is a connection to a provider for that account
          
        */
        if(existinguser){

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('searching for existing user: ' + existinguser.meta.quarryid);
          /*
          
            load the database user
            
          */
          db('user=' + existinguser.meta.quarryid).ship(function(user){

            if(user.count()<=0){

              console.log('-------------------------------------------');
              console.log('-------------------------------------------');
              console.log('-------------------------------------------');
              console.log('no user found!!!');

              var user = Container.new('user', {
                name:profile.attr('displayName')
              })

              user.append(profile);

              db.append(user).ship(function(){
                senduser(user.quarryid());
              })
            }
            else{

              console.log('-------------------------------------------');
              console.log('-------------------------------------------');
              console.log('user found');
              user.append(profile).ship(function(){
                senduser(user.quarryid());
              })  
            }
            
          })
          


        }
        /*
        
          this is a brand new user
          
        */
        else{

          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('NO USER MAKING ONE');

          var user = Container.new('user', {
            name:profile.attr('displayName')
          })

          user.append(profile);

          db.append(user).ship(function(){
            senduser(user.quarryid());
          })

        }
      }
      /*
      
        this means they have visited before!
        
      */
      else{

        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('EXISTING PROFILE');
        profile.attr(rawprofile);
        
        profile.save().ship(function(){
          profile('< user').ship(function(user){
            senduser(user.quarryid());
          })  
        })
      }

    })

  })

  return warehouse;
}
