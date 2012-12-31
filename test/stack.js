var io = require('../');
var fs = require('fs');
var eyes = require('eyes');

describe('stack', function(){

	this.timeout(1000);

	it('should be a function', function () {
		io.stack.should.be.a('function');
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
								done();
							})
					})		
			})			
		})
	})

	it('should branch mid-request', function(done){

		//console.log = function(){}
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
						done();
					})
			})	
		})
	})

})
