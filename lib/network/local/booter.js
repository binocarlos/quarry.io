#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');
var async = require('async');
var eyes = require('eyes');
var utils = require('../../server/utils');
var fs = require('fs');
var _ = require('underscore');
var Deployment = require('../deployment');

var RPC = require('./server/rpc');
var PubSub = require('./server/pubsub');
var Gateway = require('../gateway');

function factory(type, data){
  if(type=='rpc'){
    return new RPC(new Deployment(data));
  }
  else if(type=='pubsub'){
    return new PubSub(new Deployment(data)); 
  }
  else{
    throw new Error(type + ' is not a valid booter type');
  }
}

program
  .option('-t, --type <pubsub|rpc>', 'the type of node we are booting', 'rpc')
  .option('-d, --deployment <filepath>', 'the location of the JSON file for the deployment we are booting', './root.json')

program
  .command('start')
  .description('start a local network service')
  .action(function(env){

    if(!fs.existsSync(program.deployment)){
      utils.logerror(program.deployment + ' deployment file not found');
      process.exit(); 
    }

    var deployment_data = require(program.deployment);

    var server = factory(program.type, deployment_data);

    server.bind(function(){
      console.log('-------------------------------------------');
      console.log('server listening');
    })
  })

program
  .command('gateway')
  .description('start a local network gateway')
  .action(function(env){

    if(!fs.existsSync(program.deployment)){
      utils.logerror(program.deployment + ' deployment file not found');
      process.exit(); 
    }

    var deployment = require(program.deployment);

    var gateway = new Gateway({
      ports:deployment.ports,
      client_provider:function(hostname){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('get gateway: ' + hostname);
        var client_data = deployment.clients[hostname];
        var client = new Client(client_data);
        return client;
      }
    })

    gateway.bind(function(){
      console.log('-------------------------------------------');
      console.log('server listening');
    })
  })

program
  .command('*')
  .action(function(command){
    console.log('command: "%s" not found', command);
  })

program.parse(process.argv);