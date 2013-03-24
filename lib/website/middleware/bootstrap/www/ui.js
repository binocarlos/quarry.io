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
  .module('quarry.ui', [
    
    'ui.bootstrap',
    'ui.router',
    'ui.compat',

    'quarry.core',
    'quarry.ui.summary',
    'quarry.ui.page',
    'quarry.ui.auth',
    'quarry.ui.tree',
    'quarry.ui.containermenu',
    'quarry.ui.renderer',
    'quarry.ui.children',
    'quarry.ui.form'

  ])


angular.module('quarry.ui.page', [])

  .directive('contextMenu', function(){
    return {
      restrict:'EA',
      link:function($scope, $element){
        $element.bind('contextmenu', function(event){
          event.preventDefault();
          $scope.$broadcast('contextmenu', event);
          return false;
        })
      }
    }
  })


  .directive('modalWindow', function(){
    return{
      restrict:'EA',
      templateUrl:'template/page/modalwindow.html',
      replace:true,
      transclude:true,
      scope:{
        close:'&',
        confirm:'&',
        show:'=',
        confirmtitle:'@'        
      },
      controller:function($scope){
        $scope.opts = {
          backdrop: false,
          keyboard: true,
          backdropClick: true
        }
      },
      link:function($scope){
        if(!$scope.confirmtitle){
          $scope.confirmtitle = 'OK';
        }
      }
    }
  })

  .run(["$templateCache", function($templateCache){

    /*
    
      Modal
      
    */
  $templateCache.put("template/page/modalwindow.html",
[

'<div modal="show" close="close()" options="opts">',
'    <div class="modal-body" ng-transclude>',
'    </div>',
'    <div class="modal-footer">',
'        <button class="btn btn-small cancel" ng-click="close()">Cancel</button>',
'        <button class="btn" ng-click="confirm()">{{confirmtitle}}</button>',
'    </div>',
'</div>'

].join("\n")
    );

}]);





/*

  ICON
  
*/
angular.module('quarry.ui.containericon', [])

  .directive('containericon', function(){
    return{
      restrict: 'A',
      scope:true,
      link:function($scope, $element, attrs){
        if($scope.node){
          $element.attr('src', $scope.node.icon() + '?size=' + attrs.size);  
        }
        
        $element.bind('contextmenu', function(event){
          event.preventDefault();
          $scope.$emit('containercontextmenu', $scope.node, event);
          return false;
        })
      }
    }
  })




/*






  AUTH





  
*/

angular.module('quarry.ui.auth', [])

  .directive('authBar', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/auth/bar.html',
      replace:true,
      controller:'AuthCtrl'
    }
  })
  /*
  
    Login Button directive
    
  */
  .directive('loginButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/auth/loginbutton.html',
      replace:true
    }
  })

  /*
  
    Project Button directive
    
  */
  .directive('projectButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/auth/projectbutton.html',
      replace:true
    }
  })

  .controller('AuthCtrl', ['$scope', function($scope){

    var user = $scope.user;
    var buttontitle = $scope.buttontitle = user.full() ? user.title() : 'Login';
    var active = $scope.active = user.full() ? user.attr('active') || {} : {};

    var notactivelist = $scope.notactivelist = [];
    var activelist = $scope.activelist = [];
    
    _.each([
      'facebook',
      'twitter',
      'google',
      'github',
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
      document.location = $scope.authurl + '/' + name;
    }

    $scope.logout = function(){
      document.location = $scope.authurl + '/logout';
    }
  }])

  .run(["$templateCache", function($templateCache){

    /*
    
      Auth Bar
      
    */
  $templateCache.put("template/auth/bar.html",
    [
'<div class="quarry-auth pull-right" ng-cloak>',
'  <div project-button class="project-button"></div>',
'  <div login-button class="login-button"></div>',
'</div>'
    ].join("\n")
    );

  /*
  
    Login Button
    
  */
  $templateCache.put("template/auth/loginbutton.html",
    [
'<div class="btn-group">',
'  <button class="btn dropdown-toggle"><i class="icon-user icon-black"></i> {{buttontitle}}</button>',
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

  /*
  
    Project button
    
  */
  $templateCache.put("template/auth/projectbutton.html",
    [
'<div class="btn-group" ng-show="user.full()">',
'  <button class="btn btn-mini dropdown-toggle"><i class="icon-hdd icon-black" style="margin-right:4px;"></i> {{currentproject.title()}}</button>',
'  <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'    <li ng-repeat="project in projectlist">',
'      <a ng-click="edit(project);">',
'        {{project.title()}}',
'      </a>',
'    </li>',
'    <li class="divider"></li>',
'    <li>',
'      <a ng-click="create();">new</a>',
'    </li>',
'  </ul>',
'</div>'
    ].join("\n")
    );

}]);








/*






  TREE





  
*/

angular.module('quarry.ui.tree', ['quarry.ui.containericon'])


  /*
  
    Button directive
    
  */
  .directive('tree', function(){
    return{
      restrict: 'EA',      
      scope: { 
        node: '=',
        openstates: '=',
        activecontainer: '=',
        loadfn:'&',
        openfn:'&'

      },
      templateUrl:'template/tree/tree.html',
      replace:true,
      controller:function($scope){

        $scope.loadcontainer = function(node){
          $scope.openfn({
            node:node
          })
        }

        $scope.toggleopen = function(node){
          
          if($scope.openstates[node.quarryid()]=='root'){
            return;
          }
          
          var val = $scope.openstates[node.quarryid()] || false;
          $scope.openstates[node.quarryid()] = !val;

          if(val){
            $scope.openfn({
              node:node
            })
          }
          else{
            $scope.loadfn({
              node:node
            }) 
          }
        }
      }
    }
  })

  .run(["$templateCache", function($templateCache){

    /*
    
      Recursive tree view
      
    */
  $templateCache.put("template/tree/tree.html",
    [
'<div class="quarry-tree">',
'<div>',
' <div ng-show="!node.attr(\'root\')" ng-click="toggleopen(node);" class="treetoggle"> ',
'   <div ng-hide="openstates[node.quarryid()]">+</div>',
'   <div ng-show="openstates[node.quarryid()]">-</div>',
'</div>',
'<div class="treetitle" ng-class="{treeactive:activecontainer.quarryid()==node.quarryid()}" ng-click="loadcontainer(node);">',
' <img ng-show="!node.attr(\'root\')" class="icon" containericon size="16" />',
' <small>{{node.title()}}</small>',
'</div>',
'</div>',
'<div ng-show="openstates[node.quarryid()]">',
'<div class="tree">',
' <div ng-repeat="node in node.children().containers()" ng-include="\'template/tree/tree.html\'"></div>',
'</div>',
'</div>',
'</div>'
    ].join("\n")
    );

}]);



/*






  DROPDOWN
  






*/
angular.module('quarry.ui.containermenu', [])

  .directive('containerMenu', function(){
    return{
      restrict: 'EA',
      scope:{
        node:'=',
        trigger:'&'
      },
      replace:true,
      templateUrl:'template/containermenu/menu.html'
    }
  })
  
  .run(["$templateCache", function($templateCache){

    /*
    
      Menu
      
    */
  $templateCache.put("template/containermenu/menu.html",
    [


'<div class="btn-group">',
'  <button class="btn btn-mini dropdown-toggle">{{node.title()}}</button>',
'  <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'     <div class="quarrydropdown-menu" ng-repeat="node in node.children().containers()" ng-include="\'template/containermenu/menuitem.html\'"></div>',
'  </ul>',
'</div>'

    ].join("\n")
    );

  /*
  
    Item
    
  */
  $templateCache.put("template/containermenu/menuitem.html",
    [

'  <li ng-class="{\'dropdown-submenu\': node.children().full()}">',
'    <a ng-click="trigger({node:node})">{{node.title()}}</a>',
'    <ul ng-show="node.children().full()" class="dropdown-menu">',
'      <div class="quarrydropdown-menu" ng-repeat="node in node.children().containers()" ng-include="\'template/containermenu/menuitem.html\'"></div>',
'    </ul>',
'  </li>',

    ].join("\n")
    );

}]);





/*






  SUMMARY





  
*/

angular.module('quarry.ui.summary', ['quarry.ui.containericon'])

  /*
  
    The viewer is the panel of icons representing the contents of a container / results from a search
    
  */
  .directive('summary', function(){
    return{
      restrict: 'EA',
      scope:{
        node:'=',
        editfn:'&',
        deletefn:'&'
      },
      templateUrl:'template/summary/summary.html',
      replace:true
    }
  })
  
  .run(["$templateCache", function($templateCache){

    /*
    
      main view
      
    */
  $templateCache.put("template/summary/summary.html",
    [
'<div class="quarry-summary">',
'   <div>',
'   <img class="icon" ng-src="{{node.icon() && (node.icon() + \'?size=32\')}}" />',
'   <small class="title">{{node.title()}}</small>',
'   </div>',
'   <div style="height:10px;">',
'   </div>',
'   <div ng-show="node.tagname()">',
'     <small>tag: <strong>{{node.tagname()}}</strong</small>',
'   </div>',
'   <div ng-show="node.id()">',
'     <small>id: <strong>{{node.id()}}</strong></small>',
'   </div>',
'   <div ng-show="node.classnames()">',
'     <small>class: <strong>{{node.classnames().join(\' \')}}</strong></small>',
'   </div>',
'</div>'
    ].join("\n")
    );

}]);







/*










  GENERAL RENDERER










  
*/

angular.module('quarry.ui.renderer', ['quarry.ui.page'])

  .directive('renderer', function(){
    return {
      restrict: 'EA',
      scope:{
        node:'=',
        blueprints:'=',
        selection:'=',
        openfn:'&',
        deletefn:'&',
        savefn:'&',
        renderfn:'&',
        installfn:'&'
      },
      controller:function($scope, $compile){

        var defaultrenderer = '<div children-view></div>';

        $scope.tabrenderer = function(collection){

          var html = '<tabs>';

          html += _.map(collection, function(tab){
            return '<pane heading="' + tab.title + '">' + (tab.html || defaultrenderer) + '</pane>';
          })

          html += '</tabs>';

          return html;
        }

        $scope.compile = function(html){
          return $compile(html)($scope);
        }

      },
      link:function($scope, $element){

        $scope.$watch('activecontainer', function($ev){

          var container = $scope.activecontainer;

          /*
          
            this is either a string to render or an array of tabs each with:

              title
              html
            
          */
          var html = $scope.renderfn({
            node:container
          })

          if(_.isArray(html)){
            if(html.length==1){
              html = html[0].html;  
            }
            else if(html.length<=0){
              html = null;
            }
          }

          html = html ? html : $scope.defaultrenderer;

          if(_.isArray(html)){
            $scope.tabs = _.map(html, function(tab){
              return {
                title:tab.title,
                html:tab.html ? tab.html : $scope.defaultrenderer
              }
            })
            html = $scope.tabrenderer(html);
          }
          
          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('-------------------------------------------');
          console.log('rendering');
          console.log(html);
          var newelem = $scope.compile(html);
          $element.children().remove();
          $element.append(newelem);

        })
      }
    }
  })




/*











  CHILDREN VIEW











  
*/

angular.module('quarry.ui.children', [])

  /*
  
    The viewer is the panel of icons representing the contents of a container / results from a search
    
  */
  .directive('childrenView', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/children/view.html',
      replace:true,
      link:function($scope, $element, $attr){

        $scope.$on('contextmenu', function(ev, mouseevent){
          var pageX = mouseevent.pageX;
          var pageY = mouseevent.pageY;
          $element.removeClass('open');
        })

        $scope.$on('containercontextmenu', function(ev, container, mouseevent){

          var ctrlKey = mouseevent.ctrlKey;
          var pageX = mouseevent.pageX;
          var pageY = mouseevent.pageY;

          setTimeout(function(){

            $scope.$apply(function(){
              $scope.selectcontainer(container, ctrlKey);
              $element.addClass('open');
              $element.find('ul').css({
                left:(pageX - $element[0].offsetLeft + 20) + 'px',
                top:(pageY - $element[0].offsetTop + 20) + 'px'
              })
            })

          }, 50)
        })

        function update_selection(){
          $scope.node.children().data('selected', false);
          _.each($scope.selection, function(selected){
            selected.data('selected', true);
          })
        }

        $scope.$watch('selection', update_selection);

        $scope.selectcontainer = function(container, ctrlKey){
          var selection = $scope.selection;

          if(!ctrlKey){
            selection = [];
          }

          selection.push(container);

          $scope.selection = selection;
          update_selection();
        }

        $scope.deselect = function(){
          $element.removeClass('open');  
        }

        $scope.closedropdown = function(){
          $element.removeClass('open');
        }
      }
    }
  })

  .directive('containerbox', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/children/containerbox.html',
      replace:true,
      link:function($scope, $element, $attrs){

      }
    }
  })

  .directive('navbar', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/children/navbar.html',
      replace:true,
      controller:function($scope){
        $scope.triggerinstall = function(container){
          $scope.installfn({
            node:container
          })
        }
      }
    }
  })

  .directive('editButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/children/editbutton.html',
      replace:true
    }
  })

  .directive('eatClick', function() {
    return function(scope, element, attrs) {
      element.bind('click', function(event) {
        event.preventDefault();
      })
    }
  })

  .run(["$templateCache", function($templateCache){

  /*
  
    Main view
    
  */
  $templateCache.put("template/children/view.html",
    [

'     <div class="dropdown">',
'             <ul class="dropdown-menu">',
'               <li>',
'                 <a ng-click="openfn({node:selection[selection.length-1]});">Open</a>',
'               </li>',
'              <li>',
'                <a ng-click="deletefn();">Delete</a>',
'              </li>',
'              <li>',
'                <a ng-click="closedropdown();">Cancel</a>',
'              </li>',
'            </ul>',
'      <div class="row-fluid" id="nav">',
'       <div class="span12">',
'         <div navbar></div>',
'       </div>',
'      </div>',
'      <div class="row-fluid">',
'       <div class="span9" id="renderer">',
'         <div class="quarry-viewer">',
'             <div ng-repeat="node in node.children().containers()">',
'               <div containerbox>',
'              </div>',
'             </div>',
'         </div>',
'       </div>',
'      </div>',
'     </div>',
    ].join("\n")
    );

  /*
  
    Navbar
    
  */
  $templateCache.put("template/children/navbar.html",
    [
'<div>',


'   <div class="row-fluid">',
'     <div class="span12">',
'       <div class="input-append" style="width:100%;">',
'       <input class="span10" id="appendedInputButton" type="text">',
'       <button class="btn" type="button"><i class="icon-search"></i> Dig</button>',
'       </div>',
'     </div>',
'   </div>',

'   <div class="row-fluid">',
'     <div class="span12">',
'       <div container-menu node="blueprints" trigger="triggerinstall(node);"></div>',
'       <div edit-button></div>',
'     </div>',
'   </div>',

'</div>'
    ].join("\n")
    );

  /*
  
    Edit button
    
  */
  $templateCache.put("template/children/editbutton.html",
    [
'<div class="btn-group" ng-show="selection.length>0">',
'  <button class="btn btn-mini dropdown-toggle">Selection</button>',
'  <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'    <li>',
'      <a ng-click="edit();" href="#" eat-click>',
'        Open',
'      </a>',
'      <a ng-click="delete();" href="#" eat-click>',
'        Delete',
'      </a>',
'    </li>',
'  </ul>',
'</div>'
    ].join("\n")
    );

  /*
  
    Container box
    
  */
  $templateCache.put("template/children/containerbox.html",
    [
'   <div class="container" ng-class="{selected:node.data(\'selected\')}" ng-cloak ng-click="selectcontainer(node, $event.ctrlKey);" ng-dblclick="openfn({node:node});">',
'     <div class="viewer-elem">',
'       <img containericon size="48" /><br />',
'       <small>{{node.title()}}</small>',
'     </div>',
'   </div>'
    ].join("\n")
    );

}]);




/*






  FORM





  
*/

angular.module('quarry.ui.form', [])

  .directive('formView', function(){
    return {
      restrict: 'EA',
      replace:true,
      transclude:true,
      template:"template/form/view.html"
    }
  })

  .directive('fieldPane', function(){
    return {
      restrict: 'EA',
      replace:true,
      transclude:true,
      template:"template/form/pane/fields.html",
      scope:{
        node:'=',
        heading:'@'
      }
    }
  })

  .directive('metaPane', function(){
    return {
      restrict: 'EA',
      replace:true,
      transclude:true,
      template:"template/form/pane/meta.html",
      scope:{
        node:'=',
        heading:'@'
      }
    }
  })

  .directive('controlTitle', function(){
    return {
      restrict: 'EA',
      replace:true,
      transclude:true,
      template:"template/form/pane/fields.html",
      scope:{
        node:'=',
        title:'@controlTitle',
        property:'@'
      }
    }
  })

  .directive('textField', function(){
    return {
      restrict: 'EA',
      replace:true,
      template:"template/form/field/text.html",
      scope:{
        node:'=',
        property:'@'
      }
    }
  })

  .run(["$templateCache", function($templateCache){

  /*
  
    Main view
    
  */
  $templateCache.put("template/form/view.html",
[

'<div>',
'  <div class="row-fluid">',
'    <div class="span12">',
'      Button bar',
'    </div>',
'  </div>',
'  <div class="row-fluid">',
'    <div class="span12" ng-transclude>',

'    </div>',
'  </div>',
'</div>'

].join("\n"));

  /*
  
    Field Pane
    
  */
  $templateCache.put("template/form/pane/field.html",
[

'  <pane heading="{{heading}}">',
'    <form class="form-horizontal" ng-transclude>',

'    </form>',
'  </pane>'

].join("\n")
    );

  /*
  
    Meta pane
    
  */
  $templateCache.put("template/form/pane/meta.html",
[

'  <field-pane heading="{{heading}}">',
'     <text-field control-title="Tag" property="meta.tagname" />',
'     <text-field control-title="Class" property="meta.classnames" />',
'     <text-field control-title="ID" property="meta.id" />',
'  </field-pane>'

].join("\n")
    );

  /*
  
    Field control
    
  */
  $templateCache.put("template/form/field/control.html",
[

'     <div class="control-group">',
'       <label class="control-label" for="{{property}}">{{title}}</label>',
'       <div class="controls" ng-transclude>',

'       </div>',
'     </div>'

].join("\n")
    );


  /*
  
    Text field
    
  */
  $templateCache.put("template/form/field/text.html",
    [
'<input class="input-xlarge" type="text" id="{{property}}" placeholder="{{item.title}}" ng-model="model[field]" />'
    ].join("\n")
    );


}]);


