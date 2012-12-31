var io = require('../');
var eyes = require('eyes');
var fs = require('fs');

describe('warehouse', function(){

	it('should be a function', function () {
		io.warehouse.should.be.a('function');
	})

	it('should find things', function(done){

		//console.log = function(){}
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'cities2.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var supplier_config = {
			"driver":"ram.file",
			"directory":__dirname + "/fixtures/tmp/xmlfiles",
			"path":"cities",
			"format":"xml"
		}
		
		io
		.supplier(supplier_config)
		.ready(function(warehouse){

			warehouse('area', 'folder city[name^=b]')
					
				.ship(function(areas){

					areas.count().should.equal(4);
					areas.eq(1).attr('name').should.equal('Redland');
					console.log = old_log;
					done();

				})
		})

	})

})
