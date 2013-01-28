var io = require('../');

describe('container', function(){

  it('should create from basic data', function() {
  	var test = io.new('product', {
  		price:100,
  		address:{
  			postcode:'apples'
  		}
  	})

  	test.should.be.a('function');

  	test.attr('price').should.equal(100);
  	test.attr('address.postcode').should.equal('apples');
  	test.tagname().should.equal('product');
  })

  

  
})
