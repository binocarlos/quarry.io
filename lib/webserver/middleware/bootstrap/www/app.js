'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('diggerApp', ['diggerApp.filters', 'diggerApp.services', 'diggerApp.directives']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    
    $routeProvider
    	.when('/', {
    		templateUrl: 'templates/main.html',
    		controller: DiggerCtrl
    	})
    	.otherwise({redirectTo: '/'});

    $locationProvider.html5Mode(true);
    
  }]);