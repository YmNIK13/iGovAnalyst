'use strict';

angular.module("App", ["ngResource", "ngRoute", "TableCsvModule"
    //, "getDataServices"
])
//.config(function (getDataServiceProvider) {
//    getDataServiceProvider.getBranch("master")
//        .setTables("Service;ServiceData;Region;Place");
//})
.config(function ($locationProvider, $routeProvider) {

    $locationProvider.html5Mode(true);

    $routeProvider
      .when('/', {
          templateUrl: 'app/view/main.html'
          //,controller: 'MainCtrl'
      })
      .when('index/', {
          templateUrl: 'app/view/main.html'
          //,controller: 'MainCtrl'
      })
      .when('service-region/', {
          templateUrl: 'app/analystApps/serviceRegion/view.html'
          //,controller: 'AboutCtrl'
      })
      .when('service-all-ua/', {
          templateUrl: 'app/analystApps/serviceAllUA/view.html'
          //,controller: 'AboutCtrl'
      })
      .when('service-test/', {
          templateUrl: 'app/analystApps/serviceRegionTest/index.html'
          //,controller: 'AboutCtrl'
      })
      .otherwise({
          redirectTo: '/'
      })
    ;
});
