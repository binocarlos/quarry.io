var io = require('../index');
var eyes = require('eyes');
var fs = require('fs');

io
.warehouse({
	id:'root',
	hostname:'root.warehouse'
})
.use(io.supplier('ram', {
	hostname:'ram.supplier',
  data:io.new(fs.readFileSync(__dirname + '/../test/fixtures/cities.xml', 'utf8')).toJSON()
}))
.ready(function(warehouse){

  warehouse('city area.poor', 'country, place').ship(function(results){

  	console.log('-------------------------------------------');
  	eyes.inspect(results.toJSON());
    
  })
})
  