/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

'use strict';

/*

  View directive

  shows container icons in a grid

  like the viewer pane on Windows Explorer / Finder
  
*/

angular.module('quarryApp', [])
.directive('viewer', function(){
  return {
    restrict: 'E',
    scope: { node: '=' },
    compile:function(element, attrs){
      var html = [
        '   <h4>{{node.title()}}</h4>',
        '   <div class="container">',
        '     <div ng-repeat="node in node.children().containers()" ng-cloak>',
        '       <div class="viewer-elem">',
        '         <img class="viewer-img" ng-src="/files{{node.icon()}}?size=64" /><br />',
        '         {{node.title()}}',
        '       </div>',
        '     </div>',
        '   </div>'
      ]

      element.replaceWith(html.join());
      element.addClass('quarry-viewer');
    }

  } 
})