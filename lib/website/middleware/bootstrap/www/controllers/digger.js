/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

'use strict';

/*

  Quarry Bootstrap Application

  ties together all of the quarry bootstrap directives so you can trigger anything from the
  page this is included upon

  This assumes that the following are included on the page also:

    AngularJS
    Bootstrap CSS
    Bootstrap Angular Directives
  
*/

/* Controllers */
(function(){

	function DiggerCtrl($scope, quarry){

		/*
		
			the database connection
			
		*/
		var db = quarry.connect('/db/project');

		var suppliers = db.suppliers();

		$scope.project = suppliers;
		$scope.active = suppliers;

		$scope.$on('containerselect', function(e,container){

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('selected');


			$scope.active = container;
	  })

		function load_children(parent){
			if(parent.data('fixed')){
				return;
			}

			container('> *').ship(function(children){
				parent.addchildren(children);

				$scope.$apply();
			})
		}

		/*
		var project = quarry.new('project', {
			name:'Project'
		})

		db('> *').ship(function(topcontainers){
			project.append(topcontainers);
			
		})
	*/

	}

	DiggerCtrl.$inject = ['$scope', 'quarry'];

	angular.module('quarryApp').controller('DiggerCtrl', DiggerCtrl);

})()