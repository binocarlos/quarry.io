

module.exports = {
	container:require('./lib/container').factory,
	new:require('./lib/container').new,
	warehouse:require('./lib/warehouse'),
	reception:require('./lib/reception'),
	network:require('./lib/network'),
	supplier:{
		container:require('./lib/supplier/container'),
		quarrydb:require('./lib/supplier/quarrydb')
	}
}