'use strict';

/* Controllers */

function DiggerCtrl($scope, quarry){

	/*
	
		the container that is the current view data
		
	*/
	var container = quarry();

	var project = quarry.connect('/db/project');

	$scope.container = container;

	function update(newcontainer){
		container.models = newcontainer.models;
		$scope.$apply();
	}

	project('db city').ship(function(cities){

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('runinga pply');
		console.dir(cities.toJSON());

		update(cities);

		
	})

}

DiggerCtrl.$inject = ['$scope', 'quarry'];