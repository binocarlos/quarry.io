'use strict';

/* Controllers */

function DiggerCtrl($scope, quarry){

	/*
	
		the database connection
		
	*/
	var db = quarry.connect('/db/project');
	var project = quarry.new('project', {
		name:'Project'
	})

	db('> *').ship(function(topcontainers){
		project.append(topcontainers);
		$scope.project = project;
		$scope.active = project;
		$scope.$apply();
	})

}

DiggerCtrl.$inject = ['$scope', 'quarry'];