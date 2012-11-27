var io = require('../');
var eyes = require('eyes');


    var parent = io.new('folder');
    var child = io.new();

    child.addClass('red');
    child.attr('test', 10);

    parent.append(child);

    eyes.inspect(parent.find('.red').toJSON());