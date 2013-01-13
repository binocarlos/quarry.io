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
var Gateway = require('../gateway');

program
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

    var server = new RPC(new Deployment(deployment_data));

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

    /*
    
      this is the gateway config that contains
      the network config for each stack on the network (inside .clients)
      
    */
    var deployment = require(program.deployment);

    var gateway = new Gateway({
      ports:deployment.ports,
      client_provider:function(hostname, callback){
        var client_data = deployment.clients[hostname];
        var client = new Client(client_data);
        callback(null, client);
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