/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var async = require('async');
var EventEmitter = require('events').EventEmitter;

/*

  quarry.io - browser

  exports the core container api for the browser (so it is messy and hence seperate)


 */

module.exports = function(factory){

  return function(containerconfig){

    /*

      connect up the socket
      
    */
    var socket = io.connect([containerconfig.protocol, containerconfig.hostname, '/', containerconfig.socketid].join(''));

    var subscriptions = {};

    socket.on('connect', function(){
      announceready();
    })

    socket.on('broadcast', function(routingkey, message){
      console.log('-------------------------------------------');
      console.log('SOCKET broadcast!!!');

      var fns = subscriptions[routingkey];

      _.each(fns, function(fn){
        fn(message);
      })    
    })

    var switchboard = {
      listen:function(routing_key, fn){

        if(!fn){
          fn = routing_key;
          routing_key = '*';
        }

        console.dir('portal listen : ' + routing_key);

        if(!subscriptions[routing_key]){
          subscriptions[routing_key] = [];
          socket.emit('subscription', routing_key);
        }

        subscriptions[routing_key].push(fn);

        return this;
      },
      cancel:function(routing_key, fn){

        console.dir('portal cancel : ' + routing_key);

        if(fn){
          subscriptions[routing_key] = _.filter(subscriptions[routing_key], function(fn){
            return fn!==fn;
          })

          if(_.keys(subscriptions[routing_key]).length<=0){
            delete(subscriptions[routing_key]);
            socket.emit('cancelsubscription', routing_key);
          }
        }
        else{
          delete(subscriptions[routing_key]);
          socket.emit('cancelsubscription', routing_key);
        }
        return this;
      },
      broadcast:function(routing_key, packet){

        console.dir('portal broadcast : ' + routing_key);

        socket.emit('broadcast', {
          routing_key:routing_key,
          packet:packet
        })

        return this;
      }
    }

    _.extend(switchboard, EventEmitter.prototype);

    var readycallbacks = [];
    var isready = false;

    function announceready(){

      isready = true;
      async.forEach(readycallbacks, function(callback, next){
        callback();
        next();
      }, function(){

      })

      readycallbacks = [];
    }

    function supplychain(req, res, next){

      if(!isready){
        readycallbacks.push(function(){
          supplychain(req, res, next);
        })
        return;
      }

      socket.emit('request', req.toJSON(), function(response){
        res.update(response);
        res.send();
      })

    }

    supplychain.switchboard = switchboard;

    /*

      this is the browser warehouse supply chain setup
      
    */

    function getcontainer(projectpath){

      var projectroutes = containerconfig.routes.project;

      var stackroute = arguments.length>0 ? projectroutes[projectpath] : projectroutes["/"];

      stackroute || (stackroute = projectroutes["/"]);

      var containerdata = [{
        attr:{
          name:'Project Root'
        },
        meta:{
          tagname:'project',
          quarrysupplier:stackroute,
          supplychainroot:true
        }
      }]

      var retcontainer = factory(containerdata);

      /*

        merge the switchboard into the supplychain and provide it
        to the container
        
      */
      
      retcontainer.supplychain = supplychain;

      /*

        a recursive connection so we can dig down the tree in the form of clients
        
      */
      retcontainer.connect = function(submountpath, callback){

        if(!submountpath.match(/^\//)){
          submountpath = '/' + submountpath;
        }

        var newcontainer = getcontainer(submountpath);
        callback && callback(newcontainer);
        return newcontainer;
      }

      /*
      
        return a container representing a list of each top level stack route
        
      */
      retcontainer.suppliers = function(){

        var supplierdata = {
          'files':{
            title:'Files',
            icon:'drive'
          },
          'project':{
            title:'Suppliers',
            icon:'cubes'
          }
        }

        var root = factory('project', {
          name:'project'
        }).meta({
          icon:'default/root.png'
        }).data('fixed', true)
        
        _.each(['files', 'project'], function(type){
          var data = supplierdata[type];

          var folder = factory('folder', {
            name:data.title
          }).meta({
            icon:'default/' + data.icon + '.png'
          }).data('fixed', true)

          _.each(containerconfig.routes[type], function(routeval, routename){

            var supplier = factory('supplier', {
              name:routename
            }).meta({
              icon:'default/container.png',
              tagname:'project',
              quarrysupplier:routeval,
              supplychainroot:true
            })

            folder.append(supplier);
          })

          root.append(folder)
        })

        return root;
      }

      return retcontainer;
    }

    var container = getcontainer();

    function $quarry(fn){

      fn && fn(container);
      return container;

    }

    $quarry.connect = container.connect;
    $quarry.ready = $quarry;
    $quarry.new = factory;

    return $quarry;
  }
}