/// <reference path="../lib/angular.min.js" />


angular.module("App")
    .controller("mainCtrl", function ($scope) {
        
        //$locationProvider.html5Mode(true);

        //$scope.topMenu = "/app/view/topMenu.html";
        //$scope.mainMenu = "/app/view/mainMenu.html";
        $scope.headMenu = "app/view/headMenu.html";

    });
