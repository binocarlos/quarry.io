'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('diggerApp.services', []).
  value('version', '0.1').
  factory('quarry', function ($rootScope) {
    var warehouse = $quarry();
    return {
      quarry:$quarry,
      warehouse:$quarry()
    }
  });
