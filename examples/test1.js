var io = require('../index');
var eyes = require('eyes');
var fs = require('fs');


// first setup our supply chain



io
  .warehouse()
  .use(function(req, res, next){

  })
  .ready(function(warehouse){

    var generateImage = function(className){
      return warehouse.new('image').addClass(className);
    }

    var generateGallery = function(className){
      return warehouse.new('gallery').addClass(className);
    }

    var redGallery = generateGallery('red');
    var blueGallery = generateGallery('blue');

    var base = warehouse.new();

    base.append([redGallery, blueGallery]);

    var img = generateImage('picasso').attr('size', 120);

    redGallery.append(img);

    eyes.inspect(base.find('image.picasso', '.red').toJSON());

    //eyes.inspect(parent.find('.red').toJSON());
  })