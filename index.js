

module.exports = {
	container:require('./lib/container').factory,
	new:require('./lib/container').factory,
	contract:require('./lib/contract'),
	warehouse:require('./lib/warehouse'),
	reception:require('./lib/reception'),
	network:require('./lib/network'),
	supplier:{
		container:require('./lib/supplier/container'),
		rest:require('./lib/supplier/rest'),
		quarrydb:require('./lib/supplier/quarrydb')
	}
}