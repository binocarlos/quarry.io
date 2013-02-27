'use strict';

/* Controllers */

function DiggerCtrl($scope, socket) {
  socket.on('send:time', function (data) {
    $scope.time = data.time;
  });
}
DiggerCtrl.$inject = ['$scope', 'socket'];
