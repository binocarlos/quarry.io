var io = require('../');
var eyes = require('eyes');
var fs = require('fs');

describe('warehouse', function(){

	it('should route select packets', function(done){
    io
		.warehouse({
			hostname:'root.warehouse'
		})
		.use(function(packet, next){
			done();
		})
		.ready(function(warehouse){

			warehouse('apples').ship();
			
		})
  })

	it('should find warehouse selectors', function(done){
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

		  	results.attr('name').should.equal('Meadows');
		  	done();

		  })
		})
	})

	it('should find containers within the first results', function(done){

		io
		.warehouse({
			hostname:'root.warehouse'
		})
		.use(io.supplier('ram', {
			hostname:'ram.supplier',
		  data:io.new(fs.readFileSync(__dirname + '/../test/fixtures/cities.xml', 'utf8')).toJSON()
		}))
		.ready(function(warehouse){

		  warehouse('country[name^=s]').ship(function(countries){

		  	countries('city area.rich').ship(function(areas){
		  		areas.attr('name').should.equal('Meadows');
		  		done();
		  	})

		  	

		  })
		})

	})

	it('should route to multiple suppliers', function(done){

		var xml_supplier = io.supplier('file/xml', {
			hostname:'xml.supplier',
			file:__dirname + '/../test/fixtures/cities.xml'
		})

	  io
		.warehouse({
			hostname:'root.warehouse'
		})
		.use(xml_supplier)
		.ready(function(warehouse){

		  warehouse('city area.rich', 'country[name^=s]').ship(function(results){

		  	results.attr('name').should.equal('Meadows');
		  	done();

		  })
		})
	})

})
