var io = require('../');
var fs = require('fs');

describe('stack', function(){

	it('should be a function', function () {
		io.stack.should.be.a('function');
	})

	it('should find things and add things', function(done) {

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'cities2.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		io
		.network('development', {
			"resources":{
				"localfiles":__dirname + '/fixtures/tmp'
			}
		})
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){


			network.warehouse('dev.jquarry.com', function(warehouse){

				warehouse('folder').ship(function(folder){

					folder('city[name^=b]').ship(function(cities){

						var area = io.new('area', {
							name:'Hotwells',
							population:320
						}).addClass('rich')

						cities.append(area, function(results, errors){
							

							warehouse('area.rich[name^=Hot]').ship(function(results){

								results.attr('name').should.equal('Hotwells');
								done();
							})


						})



					})
				})
			})
			
			
		})


	})

})
