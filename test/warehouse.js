var io = require('../');
var eyes = require('eyes');

// we create the root warehouse with a basic supply chain
var warehouse = io.warehouse(function(packet, callback){
  callback(null, packet);
})

describe('warehouse', function(){

})
