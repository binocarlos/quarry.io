var io = require('../');
var fs = require('fs');
var eyes = require('eyes');

describe('stack', function(){

	this.timeout(1000);

	it('should be a function', function () {
		io.stack.should.be.a('function');
	})

	it('should find things', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'cities2.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){
				warehouse('folder')
					.ship(function(folder){
						folder('city[name^=b]')
							.ship(function(cities){
								cities.count().should.equal(2);
								cities.eq(0).attr('name').should.equal('Bristol');
								console.log = old_log;
								eyes.inspect = old_eyes;
								done();
							})
					})		
			})			
		})
	})

	it('should branch mid-request', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'citiesbranch.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){
				warehouse('folder city')
					.ship(function(cities){
						cities.count().should.equal(10);
						console.log = old_log;
						eyes.inspect = old_eyes;
						done();
					})
			})	
		})
	})

	it('should append things', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'citiesbranch.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){

				warehouse('folder city[name^=b]')
					
					.ship(function(cities){

						var area = io.new('area', {
							name:'Bishopston',
							population:387
						}).addClass('rich')

						cities.append(area).ship(function(appended){

							var house = io.new('house', {
								name:'Big House',
								population:3
							}).addClass('grand')

							appended.append(house)
							.ship(function(houses){
								warehouse('folder city[name^=b] area[name^=Bish] house').ship(function(houses){
									houses.count().should.equal(3);
									houses.eq(1).attr('name').should.equal('Big House');
									console.log = old_log;
									eyes.inspect = old_eyes;
									done();
								})
							})
							
							
							
						})



						
					})

			})	
		})
	})

it('should save things', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'citiesbranch.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){

				warehouse('folder city[name^=b]')
					
					.ship(function(cities){

						cities.attr({
							'food':'Ice Cream'
						}).addClass('chocolate');

						cities.save().ship(function(saved){

							warehouse('folder city[name^=b]')

								.ship(function(cities2){
									cities2.attr('food').should.equal('Ice Cream');
									cities2.hasClass('chocolate').should.equal(true);
									console.log = old_log;
									eyes.inspect = old_eyes;
									done();
								})
							
							
							
						})



						
					})

			})	
		})
	})

it('should delete things', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'citiesbranch.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){

				warehouse('folder city[name^=b]')
					
					.ship(function(cities){

						cities.count().should.equal(3);

						cities.delete().ship(function(){

							warehouse('folder city[name^=b]')

								.ship(function(cities2){
									cities2.count().should.equal(0);
									console.log = old_log;
									eyes.inspect = old_eyes;
									done();
								})

						})
						
					})

			})	
		})
	})

it('should broadcast portals', function(done){

		var old_eyes = eyes.inspect;
		eyes.inspect = function(){}
		var old_log = console.log;
		console.log = function(){}

		var folder = __dirname + '/fixtures/tmp/xmlfiles/';
		var livefile = folder + 'cities.xml';
		var backupfile = folder + 'citiesbranch.xml';

		var livefile2 = folder + 'usacities.xml';
		var backupfile2 = folder + 'usacities2.xml';

		var content = fs.readFileSync(backupfile, 'utf8');
		fs.writeFileSync(livefile, content, 'utf8');

		var content2 = fs.readFileSync(backupfile2, 'utf8');
		fs.writeFileSync(livefile2, content2, 'utf8');

		var network_config = {
			"resources":{
				"cache":{
					"driver":"redis",
					"hostname":"127.0.0.1",
					"port":6379
				},
				"localfiles":__dirname + '/fixtures/tmp'
			}
		}
		
		io
		.network('development', network_config)
		.stack({
			hostname:'dev.jquarry.com',
			path:__dirname+'/fixtures/stack'
		})
		.listen(function(network){
			network.warehouse('dev.jquarry.com', function(warehouse){

				warehouse('folder city[name^=b]')
			
					.ship(function(cities){

						var area = io.new('area', {
							name:'Bishopston',
							population:387
						}).addClass('rich')

						cities.append(area).ship(function(appended){

							var portalcount = 0;

							appended.portal(function(message){
								portalcount++;
							})

							var house = io.new('house', {
								name:'Big House',
								population:3
							}).addClass('grand')

							appended.append(house)
							.ship(function(houses){
								portalcount.should.equal(3);
								console.log = old_log;
								eyes.inspect = old_eyes;
								done();
							})
							
							
							
						})



						
					})

			})	
		})
	})

})
