var io = require('../index');
var eyes = require('eyes');
var fs = require('fs');

io
.warehouse({
	hostname:'root.warehouse'
})
.use(io.supplier('ram', {
	hostname:'ram.supplier',
  data:io.new(fs.readFileSync(__dirname + '/../test/fixtures/cities.xml', 'utf8')).toJSON()
}))
.ready(function(warehouse){

  warehouse('city area.rich', 'country[name^=s]').ship(function(results){

  	console.log('-------------------------------------------');
  	console.log('here are results');
  	eyes.inspect(results.toJSON());
    
  })
})
  