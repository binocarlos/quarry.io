'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('quarryApp', []).
  value('version', '0.1').
  factory('quarry', function ($rootScope) {
    return $quarry;
  });
