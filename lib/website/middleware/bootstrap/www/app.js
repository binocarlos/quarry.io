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

angular
  .module('ui.quarry', [
    'ui.bootstrap',
    'ui.quarry.tpls',
    'ui.quarry.authbutton',
    'ui.quarry.digger',
    'ui.quarry.navbar',
    'ui.quarry.tree',
    'ui.quarry.viewer'
  ])

angular.module("ui.quarry.tpls", [
  "template/auth/auth.html",
  "template/digger/digger.html",
  "template/navbar/navbar.html",
  "template/tree/tree.html",
  "template/viewer/viewer.html",
  "template/viewer/containerbox.html"
])




/*






  AUTH





  
*/

angular.module('ui.quarry.authbutton', [])

  /*
  
    Controller
    
  */
  .controller('AuthCtrl', ['$scope', function($scope){
    
    var user = $scope.user;
    var hasuser = $scope.hasuser = !user.empty();
    var buttontitle = $scope.buttontitle = hasuser ? user.title() : 'Login';

    var active = hasuser ? user.attr('active') || {} : {};
    
    var notactivelist = $scope.notactivelist = [];
    var activelist = $scope.activelist = [];

    _.each([
      'facebook',
      'twitter',
      'google',
      'dropbox'
    ], function(name){
      var user_profile = user.attr(name + '_profile');
      if(active[name]){
        activelist.push({
          id:name,
          name:name.replace(/^\w/, function(st){
            return st.toUpperCase();
          }),
          image:user_profile.image
        })
      }
      else{
        notactivelist.push({
          id:name,
          name:name.replace(/^\w/, function(st){
            return st.toUpperCase();
          }),
          image:user_profile && user_profile.image ? user_profile.image : "/img/" + name + ".png?size=16"
        })
      }
    })

    $scope.loginwith = function(name){
      document.location = ($scope.loginurl || '/auth').replace(/\/$/, '') + '/' + name;
    }

    $scope.logout = function(){
      document.location = $scope.logouturl || '/auth/logout';
    }
  }])

  /*
  
    Button directive
    
  */
  .directive('authButton', function(){
    return{
      restrict: 'EA',
      scope: {
        user:'=',
        loginurl:'@',
        logouturl:'@'
      },
      controller:'AuthCtrl',
      templateUrl:'template/auth/auth.html',
      replace:true
    }
  })



angular.module("template/auth/auth.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/auth/auth.html",
    [
'<div class="btn-group">',
'  <button class="btn dropdown-toggle" ng-bind="buttontitle">Login</button>',
'  <button class="btn dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'    <li class="sectiontitle" ng-show="notactivelist.length>0">login with:</li>',
'    <li class="divider" ng-show="notactivelist.length>0"></li>',
'    <li ng-repeat="provider in notactivelist">',
'      <a ng-click="loginwith(provider.name);" ng-href="#">',
'        <img class="icon" ng-src="{{provider.image}}" /> {{provider.name}}',
'      </a>',
'    </li>',
'    <li class="divider" ng-show="hasuser"></li>',
'    <li class="sectiontitle" ng-show="hasuser">connected to:</li>',
'    <li class="divider" ng-show="hasuser"></li>',
'    <li ng-repeat="provider in activelist">',
'      <a ng-click="loginwith(provider.name);" ng-href="#">',
'        <img class="icon" ng-src="{{provider.image}}" /> {{provider.name}}',
'      </a>',
'    </li>',
'    <li class="divider" ng-show="hasuser"></li>',
'    <li ng-show="hasuser">',
'      <a ng-click="logout();" ng-href="#">logout</a>',
'    </li>',
'  </ul>',
'</div>'
    ].join("\n")
    );
}]);


        


/*






  DIGGER





  
*/

angular.module('ui.quarry.digger', [])

  /*
  
    Controller
    
  */
  .controller('DiggerCtrl', ['$scope', function($scope){

    $scope.warehouse.attr('root', true);

    function assign_current_container(container){

      $scope.activecontainer = container;

      container('>*')
        .debug(function(message){
          console.dir(message);
        })
        .ship(function(children){
          container.get(0).children = [];
          container.addchildren(children);
          $scope.$apply();

        })  
    }

    assign_current_container($scope.warehouse)

    $scope.$on('selectContainer', function($e, new_container){
      assign_current_container(new_container);
    })
    

  }])

  /*
  
    Button directive
    
  */
  .directive('digger', function(){
    return{
      restrict: 'EA',
      scope:{
        warehouse:'='
      },
      controller:'DiggerCtrl',
      templateUrl:'template/digger/digger.html',
      replace:true
    }
  })

angular.module("template/digger/digger.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/digger/digger.html",
    [
'<div class="row">',
'  <div class="span3">',
'    <div tree node="warehouse"></div>',
'  </div>',
'  <div class="span9">',
'    <div class="row">',
'      <div class="span9">',
'       <div navbar></div>',
'      </div>',
'     <div class="span9">',
'        <div viewer node="activecontainer"></div>',
'     </div>',
'    </div>',
' </div>',
'</div>'
    ].join("\n")
    );
}]);

/*






  NAVBAR





  
*/

angular.module('ui.quarry.navbar', [])

  /*
  
    Controller
    
  */
  .controller('NavbarCtrl', ['$scope', function($scope){
    
    
  }])

  /*
  
    Button directive
    
  */
  .directive('navbar', function(){
    return{
      restrict: 'EA',
      controller:'NavbarCtrl',
      templateUrl:'template/navbar/navbar.html',
      replace:true
    }
  })


angular.module("template/navbar/navbar.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/navbar/navbar.html",
    [
'<div>',    
'<input type="text" style="width:100%;" />',
'</div>'
    ].join("\n")
    );
}]);


/*






  TREE





  
*/

angular.module('ui.quarry.tree', ['ui.quarry.containericon'])

  /*
  
    Controller
    
  */
  .controller('TreeCtrl', ['$scope', function($scope){
    
    
  }])

  /*
  
    Button directive
    
  */
  .directive('tree', function(){
    return{
      restrict: 'EA',
      controller:'TreeCtrl',
      scope: { node: '=' },
      templateUrl:'template/tree/tree.html',
      replace:true
    }
  })

angular.module("template/tree/tree.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/tree/tree.html",
    [
'<div class="quarry-tree">',
'<div>',
' <div ng-show="!node.attr(\'root\')" class="treetoggle">+ </div>',
' <img ng-show="!node.attr(\'root\')" class="icon" containericon size="16" />',
' {{node.title()}}',
'</div>',
'<div class="tree">',
' <div ng-repeat="node in node.children().containers()" ng-include="\'template/tree/tree.html\'"></div>',
'</div>',
'</div>'
    ].join("\n")
    );
}]);

/*






  VIEWER





  
*/

angular.module('ui.quarry.viewer', ['ui.quarry.containericon'])

  /*
  
    Controller
    
  */
  .controller('ViewerCtrl', ['$scope', function($scope){
    
    $scope.selectcontainer = function(container){
      $scope.$emit('selectContainer', container);
    }
  }])

  /*
  
    Button directive
    
  */
  .directive('viewer', function(){
    return{
      restrict: 'EA',
      controller:'ViewerCtrl',
      scope: { node: '=' },
      templateUrl:'template/viewer/viewer.html',
      replace:true
    }
  })
  .directive('containerbox', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/viewer/containerbox.html',
      replace:true
    }
  })


angular.module("template/viewer/viewer.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/viewer/viewer.html",
    [
'<div class="quarry-viewer">',    
' <h4>{{node.title()}}</h4>',
'   <div ng-repeat="node in node.children().containers()">',
'     <div containerbox>',
'     </div>',
'   </div>',
'</div>'
    ].join("\n")
    );
}]);

angular.module("template/viewer/containerbox.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/viewer/containerbox.html",
    [
'   <div class="container" ng-cloak ng-dblclick="selectcontainer(node);">',
'     <div class="viewer-elem">',
'       <img containericon size="64" />',
'       {{node.title()}}',
'     </div>',
'   </div>'
    ].join("\n")
    );
}]);


angular.module('ui.quarry.containericon', [])

  /*
  
    Button directive
    
  */
  .directive('containericon', function(){
    return{
      restrict: 'A',
      scope:true,
      link:function($scope, element, attrs){
        element.attr('src', $scope.node.icon() + '?size=' + attrs.size);
      }
    }
  })
