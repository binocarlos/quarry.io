'use strict';

/* Directives */

angular.module('quarry.tree', [])
.directive('tree', function ($compile) {
  return {
    templateUrl: 'tree/index.html',
    restrict: 'E',
    scope: { node: '=' }
  } 
})