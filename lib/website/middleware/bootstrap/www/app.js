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
    'ui.router',
    'ui.compat',
    'ui.quarry.warehouse',
    'ui.quarry.tpls',
    'ui.quarry.auth',
    'ui.quarry.digger',
    'ui.quarry.navbar',
    'ui.quarry.tree',
    'ui.quarry.viewer'
  ])
  


angular.module("ui.quarry.tpls", [
  "template/auth/loginbutton.html",
  "template/auth/projectbutton.html",
  "template/digger/digger.html",
  "template/navbar/navbar.html",
  "template/navbar/editbutton.html",
  "template/navbar/installbutton.html",
  "template/tree/tree.html",
  "template/viewer/viewer.html",
  "template/viewer/containerbox.html",
  "template/form/form.html",
  "template/form/item.html",
  "template/form/window.html"
])

angular.module('ui.quarry.warehouse', [])
.factory('$warehouse', function() {
  
  var user = $quarry.user;
  var warehouseroute = user.attr('projectid') ? ('/project/' + user.attr('projectid')) : '/';
  
  var warehouse = $quarry.connect(warehouseroute);
  warehouse.user = user;

  return warehouse;
})


/*






  AUTH





  
*/

angular.module('ui.quarry.auth', [])

  /*
  
    Login Button directive
    
  */
  .directive('loginButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/auth/loginbutton.html',
      replace:true,
      controller:'AuthCtrl'
      
    }
  })

  /*
  
    Project Button directive
    
  */
  .directive('projectButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/auth/projectbutton.html',
      replace:true,
      controller:'AuthCtrl'
    }
  })

  .controller('AuthCtrl', ['$scope', '$warehouse', function($scope, $warehouse){

    var user = $scope.user;
    var buttontitle = $scope.buttontitle = user.full() ? user.title() : 'Login';
    var active = $scope.active = user.full() ? user.attr('active') || {} : {};

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
      document.location = ('/auth').replace(/\/$/, '') + '/' + name;
    }

    $scope.logout = function(){
      document.location = '/auth/logout';
    }
  }])



angular.module("template/auth/loginbutton.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/auth/loginbutton.html",
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

angular.module("template/auth/projectbutton.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/auth/projectbutton.html",
    [
'<div class="btn-group" ng-show="user.full()">',
'  <button class="btn btn-mini dropdown-toggle" ng-bind="currentproject.title()">Projects</button>',
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






  DIGGER





  
*/

angular.module('ui.quarry.digger', ['ui.quarry.form'])

  /*
  
    Controller
    
  */
  .controller('DiggerCtrl', ['$scope', '$dialog', '$warehouse', function($scope, $dialog, $warehouse){

    /*
    
      this is modified by the viewer and used to determine what we are deleting etc
      
    */
    $scope.selection = [];
    $scope.clipboard = [];

    var static_blueprints = $scope.blueprints.models || [];

    console.log('-------------------------------------------');
    console.log('-------------------------------------------');
    console.dir(static_blueprints);
    console.log('-------------------------------------------');
    console.log('-------------------------------------------');

    
    function reload_container(){
      load_container_children($scope.activecontainer);
    }

    function load_blueprints(warehouse){
      console.log('-------------------------------------------');
      console.log('loading blueprints');
      $warehouse('.blueprint').ship(function(loaded_blueprints){
        console.log('-------------------------------------------');
        console.log('loaded');
        console.log('-------------------------------------------');
        console.dir(loaded_blueprints.toJSON());
        console.dir(static_blueprints);
        var newmodels = static_blueprints.concat(loaded_blueprints.models);
        $scope.$apply(function(){
          $scope.blueprints.models = newmodels;
        })
      })
    }

    function load_container_children(container){

      container('>*')
      /*
        .debug(function(message){
          console.dir(message);
        })
      */
        .ship(function(children){
          container.get(0).children = [];
          container.addchildren(children);
          $scope.$apply(function(){
            $scope.activecontainer = container;
          })
        })  
    }

    function delete_containers(containers){
      $warehouse.merge(_.map(containers, function(container){
        return container.delete();
      })).ship(function(){
        reload_container();
      })
    }

    function save_loop(container){
      save_container(container, function(){
        $scope.create(container);
      })
    }

    function save_blueprint(container){
      container.addClass('blueprint');
      save_container(container, function(){
        load_blueprints();
      })
    }

    function save_container(container, done){

      /*
      
        this means it is added
        
      */
      if($scope.freshcontainer){

        /*
        
          this means we are installing something exotic

          we send a packet off to the destination (which is probably a provider that will
          create the resource)

          we get back a ghost definition which is what we actually append to the active container

          
        */
        if(container.tagname()=='installer'){
          alert('Installing cool thing');
        }
        else{
          $scope.activecontainer.append(container).ship(function(){            
            done && done();
          })
        }
        
      }
      else{

        /*
        
          get the server save done
          
        */
        container.save().ship(function(){
          done && done();
        })
      }
    }

    $scope.create = function(blueprint){

      $scope.freshcontainer = true;
      $scope.formcontainer = blueprint.blueprint($scope.activecontainer);
      $scope.formshow = true;
      
    }

    $scope.install = function(blueprint){

      alert('install: ' + blueprint.summary());
      
    }

    $scope.edit = function(container){
      
      $scope.freshcontainer = false;
      $scope.formcontainer = container;
      $scope.formshow = true;
      

    }

    $scope.$watch('warehouse', function(){
      $scope.warehouse.attr('root', true);
      
      load_container_children($scope.warehouse);
      load_blueprints($scope.warehouse);
    })

    $scope.formshow = false;
    $scope.formcontainer = $scope.warehouse;

    $scope.$on('open', function(ev, container){
      load_container_children(container);
    })

    $scope.$on('edit', function(ev, container){
      $scope.selection.length>0 && $scope.edit($scope.selection[0]);
    })

    $scope.$on('delete', function(ev){
      $scope.selection.length>0 && delete_containers($scope.selection);
    })

    $scope.$on('savecontainer', function(ev, container){
      save_container(container);
    })

    $scope.$on('saveblueprint', function(ev, container){
      save_blueprint(container);
    })

    $scope.$on('savecontainerloop', function(ev, container){
      save_loop(container);
    })

    

  }])

  /*
  
    Button directive
    
  */
  .directive('digger', function(){
    return{
      restrict: 'EA',
      controller:'DiggerCtrl',
      scope:{
        warehouse:'=',
        blueprints:'=',
        installers:'='
      },
      templateUrl:'template/digger/digger.html',
      replace:true,
      link:function(){

      }
    }
  })

angular.module("template/digger/digger.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/digger/digger.html",
    [
'<div class="row-fluid" ng-show="activecontainer.data(\'active\')">',
'  <div class="span3">',
'    <div tree node="warehouse"></div>',
'  </div>',
'  <div class="span9">',
'    <div class="row-fluid">',
'      <div class="span12">',
'       <div navbar></div>',
'      </div>',
'     <div class="span12">',
'        <div viewer selection="selection" node="activecontainer"></div>',
'     </div>',
'    </div>',
' </div>',
' <div formwindow freshcontainer="freshcontainer" show="formshow" blueprint="blueprintcontainer" container="formcontainer"></div>',
'</div>'
    ].join("\n")
    );
}]);

/*






  NAVBAR





  
*/

angular.module('ui.quarry.navbar', [])


  /*
  
    Button directive
    
  */
  .directive('navbar', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/navbar/navbar.html',
      replace:true
    }
  })

  .directive('installButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/navbar/installbutton.html',
      replace:true
    }
  })

  .directive('editButton', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/navbar/editbutton.html',
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


angular.module("template/navbar/navbar.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/navbar/navbar.html",
    [
'<div>',
'   <div class="row-fluid">',
'     <div class="span8">',
'       <h4 style="margin-top:0px;">{{activecontainer.title()}}</h4>',
'     </div>',
'   </div>',
'   <div class="row-fluid">',
'     <div class="span2">',
'       <div install-button></div>',
'       <div edit-button></div>',
'     </div>',
'     <div class="span6">',
'       <div class="input-append">',
'       <input class="input-xxlarge" id="appendedInputButton" type="text">',
'       <button class="btn" type="button">Dig</button>',
'       </div>',
'     </div>',
'   </div>',
'</div>'
    ].join("\n")
    );
}]);


angular.module("template/navbar/installbutton.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/navbar/installbutton.html",
    [
'<div class="btn-group">',
'  <button class="btn btn-mini dropdown-toggle">Create</button>',
'  <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'    <li ng-repeat="blueprint in static_blueprints.containers()">',
'      <a ng-click="create(blueprint);" href="#" eat-click>',
'        {{blueprint.title()}}',
'      </a>',
'    </li>',
'    <li ng-repeat="blueprint in blueprints.containers()">',
'      <a ng-click="create(blueprint);" href="#" eat-click>',
'        {{blueprint.title()}}',
'      </a>',
'    </li>',
'    <li class="divider" ng-show="(blueprints.count()>0 || static_blueprints.count()>0) && installers.count()>0" style=""></li>',
'    <li ng-repeat="installer in installers.containers()">',
'      <a ng-click="install(installer);" href="#" eat-click>',
'        {{installer.title()}}',
'      </a>',
'    </li>',
'  </ul>',
'</div>'
    ].join("\n")
    );
}]);

angular.module("template/navbar/editbutton.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/navbar/editbutton.html",
    [
'<div class="btn-group" ng-show="selection.length>0">',
'  <button class="btn btn-mini dropdown-toggle">Edit</button>',
'  <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">',
'    <span class="caret"></span>',
'  </button>',
'  <ul class="dropdown-menu">',
'    <li>',
'      <a ng-click="edit();" href="#" eat-click>',
'        Edit',
'      </a>',
'      <a ng-click="delete();" href="#" eat-click>',
'        Delete',
'      </a>',
'      <a ng-click="cut();" href="#" eat-click>',
'        Cut',
'      </a>',
'      <a ng-click="copy();" href="#" eat-click>',
'        Copy',
'      </a>',
'      <a ng-click="paste();" href="#" eat-click>',
'        Paste',
'      </a>',
'    </li>',
'  </ul>',
'</div>'
    ].join("\n")
    );
}]);

/*






  TREE





  
*/

angular.module('ui.quarry.tree', ['ui.quarry.containericon'])


  /*
  
    Button directive
    
  */
  .directive('tree', function(){
    return{
      restrict: 'EA',      
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
  
    The viewer is the panel of icons representing the contents of a container / results from a search
    
  */
  .directive('viewer', function(){
    return{
      restrict: 'EA',
      scope:{
        node: '=',
        selection: '='
      },
      templateUrl:'template/viewer/viewer.html',
      replace:true,
      link:function($scope, $element, $attr){

        $scope.$on('containercontextmenu', function(ev, container, mouseevent){
          $scope.$apply(function(){
            $scope.selectcontainer(container, mouseevent, true);
            $element.addClass('open');
            $element.find('ul').css({
              left:(event.pageX - $element[0].offsetLeft + 20) + 'px',
              top:(event.pageY - $element[0].offsetTop + 20) + 'px'
            })
          })
        })

        $scope.selectcontainer = function(container, ev, keepselection){
          if(!ev.ctrlKey){
            if(keepselection){
              if(!container.data('selected')){
                $scope.selection = [];
              }
            }
            else{
              $scope.selection = [];
            }
            
          }

          $element.removeClass('open');
          $scope.node.children().data('selected', false);

          $scope.selection.push(container);
          _.each($scope.selection, function(selected){
            selected.data('selected', true);
          })
        }

        $scope.opencontainer = function(container){
          $element.removeClass('open');
          $scope.$emit('open', container);
        }

        $scope.deselect = function(){
          $element.removeClass('open');  
        }

        $scope.edit = function(){
          $scope.$emit('edit');
        }

        $scope.delete = function(){
          $scope.$emit('delete');
        }
      }
    }
  })
  .directive('containerbox', function(){
    return{
      restrict: 'EA',
      templateUrl:'template/viewer/containerbox.html',
      replace:true,
      link:function($scope, $element, $attrs){

      }
    }
  })


angular.module("template/viewer/viewer.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/viewer/viewer.html",
    [
'<div class="quarry-viewer dropdown">',
'   <div ng-repeat="node in node.children().containers()">',
'     <div containerbox>',
'     </div>',
'   </div>',
'   <ul class="dropdown-menu">',
'     <li>',
'       <a ng-click="edit();">Edit</a>',
'     </li>',
'     <li>',
'       <a ng-click="delete();">Delete</a>',
'     </li>',
'   </ul>',
'</div>'
    ].join("\n")
    );
}]);

angular.module("template/viewer/containerbox.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/viewer/containerbox.html",
    [
'   <div class="container" ng-class="{selected:node.data(\'selected\')}" ng-cloak ng-click="selectcontainer(node, $event);" ng-dblclick="opencontainer(node);">',
'     <div class="viewer-elem">',
'       <img containericon size="64" /><br />',
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
      link:function($scope, $element, attrs){
        $element.attr('src', $scope.node.icon() + '?size=' + attrs.size);
        $element.bind('contextmenu', function(event){
          event.preventDefault();
          $scope.$emit('containercontextmenu', $scope.node, event);
          return false;
        })
      }
    }
  })



/*






  FORM





  
*/

angular.module('ui.quarry.form', ['ui.quarry.containericon'])

  .directive('formfields', function(){
    return{
      restrict:'EA',
      templateUrl:'template/form/form.html',
      scope:{
        container:'='
      },
      controller:function($scope){

        $scope.quarryitems = [{
          title:'Tagname',
          field:'tagname'
        },{
          title:'#ID',
          field:'id'
        },{
          title:'.Classnames',
          field:'classnames'
        },{
          title:'Department',
          field:'quarrydepartment'
        },{
          title:'Supplier',
          field:'quarrysupplier'
        },{
          title:'Quarry ID',
          field:'quarryid'
        }]

        $scope.blueprintitems = $scope.container.meta('blueprint') || [];
        $scope.rawjson = JSON.stringify($scope.container.models[0], null, 4);

      }
    }
  })
  .directive('formitem', function(){
    return{
      restrict:'EA',
      templateUrl:'template/form/item.html',
      scope:{
        item:'=',
        model:'='
      }
    }
  })
  .directive('formwindow', function(){
    return{
      restrict:'EA',
      templateUrl:'template/form/window.html',
      scope:{
        container:'=',
        freshcontainer:'=',
        show:'='
      },
      controller:function($scope, $warehouse){
        $scope.opts = {
          backdrop: false,
          keyboard: true,
          backdropClick: true
        }

        $scope.$watch('freshcontainer', function(){
          $scope.makebuttontitle = $scope.freshcontainer ? 'Create' : 'Save';
        })
        

        $scope.close = function(){
          $scope.show = false;
        }

        $scope.save = function(){

          $scope.close();
          $scope.$emit('savecontainer', $scope.container);
          
        }

        $scope.saveblueprint = function(){

          $scope.close();
          $scope.$emit('saveblueprint', $scope.container);
          
        }

        $scope.addanother = function(){

          $scope.close();
          $scope.$emit('savecontainerloop', $scope.container);
          
        }

      }
    }
  })
  

angular.module("template/form/item.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/form/item.html",
    [
'<div class="control-group">',
'  <label class="control-label" for="{{item.field}}">{{item.title}}</label>',
'  <div class="controls">',
'    <input class="input-xlarge" type="text" id="{{item.field}}" placeholder="{{item.title}}" ng-model="model[item.field]" />',
'  </div>',
'</div>'
    ].join("\n")
    );
}]);

angular.module("template/form/form.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/form/form.html",
[
'<tabs>',
'  <pane heading="attr">',
'    <form class="form-horizontal">',
'    <div ng-repeat="item in blueprintitems">',
'      <div formitem model="container.attr()" item="item">',
'      </div>',
'    </div>',
'    </form>',
'  </pane>',
'  <pane heading="meta">',
'    <form class="form-horizontal">',
'    <div ng-repeat="item in quarryitems">',
'      <div formitem model="container.meta()" item="item">',
'      </div>',
'    </div>',
'    </form>',
'  </pane>',
'  <pane heading="raw">',
'    <textarea style="width:95%;height:250px;">{{rawjson}}</textarea>',
'  </pane>',
'</tabs>'
].join("\n")
    );
}]);

angular.module("template/form/window.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/form/window.html",
[

'<div modal="show" close="close()" options="opts">',
'    <div class="modal-body">',
'        <div formfields blueprint="blueprint" container="container"></div>',
'    </div>',
'    <div class="modal-footer">',
'        <button class="btn btn-small btn-warning cancel" ng-click="close()">Cancel</button>',
'        <button class="btn btn-small" ng-click="addanother()" ng-show="freshcontainer">{{makebuttontitle}} Another</button>',
'        <button class="btn btn-small" ng-click="saveblueprint()">{{makebuttontitle}} Blueprint</button>',
'        <button class="btn btn-primary" ng-click="save()">{{makebuttontitle}}</button>',
'    </div>',
'</div>'

].join("\n")
    );
}]);