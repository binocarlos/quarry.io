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
var eyes = require('eyes');
var utils = require('../../../utils');
var util = require('util');
var dye = require('dye');
var EventEmitter = require('events').EventEmitter;
var Device = require('../../device');

module.exports = factory;

/*
  Quarry.io - Mesh Observer
  -------------------------

  Used as the central DNS system for the brokerless setup
  we have

  The idea is to keep actual endpoints we bind to at a minimum

  Endpoints that are observed:

    Network x 2
    -----------
      load balancer - the front facing servers that know about all stacks - HTTP only

        domain routing -> stack fronthttp

    HQ x 2
    ------
      hqrpc - the system RPC socket

        incoming from stack workers and root users

      hqpub - the system PUB socket
      hqsub - the system SUB socket

        realtime for stack workers and root users

    Stack x ?
    ---------
      fronthttp - the incoming HTTP socket (customers websites connect to here)
      frontrpc - the incoming RPC socket (the backend loops around to here)
      back - the routing RPC socket (suppliers connect to here)
      portal - internal pub/sub for supplier feedback - triggers the radio
      radio - the public realtime event listener

  

  

 */


function factory(options){

  var selector = (options.selector || 'department.reception');

  /*
            
    ignore worker is because sometimes a worker wants to listen for other workers
    in it's department (like switchboard workers all talking to each other)
    
  */
  function filterworker(worker){
    return !(options.ignore_worker && worker.quarryid()==options.ignore_worker);
  }

  var observer = {
    workers:{},
    bind:function(deployment){

      /*

        load the department and then its workers

        this forms the initial routing table

        we then listen onto the department for any workers coming or going
        
      */

      deployment(selector).ship(function(department){

        /*
        
          find the initial workers
          
        */
        department('worker').ship(function(workers){


          workers = workers.filter(filterworker);

          workers.each(function(worker){
            workers[worker.quarryid()] = worker;
            observer.emit('add', worker);
          })

          /*
          
            setup a portal for any changes
            
          */
          department.portal()
            .saved('worker', function(worker){
              if(!filterworker(worker)){
                return;
              }
              workers[worker.quarryid()].inject(worker);
              observer.emit('save', worker);
            })
            .appended('worker', function(worker){
              if(!filterworker(worker)){
                return;
              }
              workers[worker.quarryid()] = worker;
              observer.emit('add', spark);
            })
            .deleted('worker', function(worker){
              if(!filterworker(worker)){
                return;
              }
              delete(workers[worker.quarryid());
              observer.emit('delete', spark);
            })

          callback();
        })
      })
    }
  }

  _.extend(observer, EventEmitter.prototype);

  return observer;
}