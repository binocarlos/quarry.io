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

var server_classes = {
  rpc:require('./rpc'),
  pubsub:require('./pubsub')
}

program
  .option('-t, --type <pubsub|rpc>', 'the type of node we are booting', 'rpc')
  .option('-d, --deployment <filepath>', 'the location of the JSON file for the deployment we are booting', './root.json')

program
  .command('start')
  .description('start a local network service')
  .action(function(env){

    if(!server_classes[program.type]){
      utils.logerror(program.type + ' server type not found');
      process.exit();
    }

    if(!fs.existsSync(program.deployment)){
      utils.logerror(program.deployment + ' deployment file not found');
      process.exit(); 
    }

    var deployment_data = require(program.deployment);

    var ServerClass = server_classes[program.type];

    var server = new ServerClass(new Deployment(deployment_data));

    server.listen(function(){
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