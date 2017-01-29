/// <reference path="../../lib/angular-1.6.1/angular.min.js" />

angular.module("App")
    .controller("serviceAllUACtrl", function ($scope, $http, $filter, tableCSCtoJSON) {

        $scope.branchs = [{ name: "Альфа", value: "test" },
            { name: "Бета", value: "test-beta" },
            { name: "Дельта", value: "test-delta" },
            { name: "Мастер", value: "master" }
        ];

        $scope.scvFiles = [
            { name: "Города", value: "Place" },
            { name: "Области", value: "Region" },
            { name: "Услуги", value: "Service" },
            { name: "Открытые районы", value: "ServiceData" }
        ];

        //инциализация таблиц
        $scope.init = function (branch) {

            $scope.progres.val = 0;

            new tableCSCtoJSON(branch, "Region")
                .then(function (responce) {
                    $scope.csvRegion = responce
                        .selectNotValue('nID', undefined);
                    $scope.progres.val += 25;
                });

            new tableCSCtoJSON(branch, "Place")
                 .then(function (responce) {
                     $scope.csvPlace = responce
                        .selectFill('nID ; sID_UA ; sName')
                        .selectNotValue('nID', undefined);
                     $scope.progres.val += 25;
                 });

            new tableCSCtoJSON(branch, "Service")
                .then(function (responce) {
                    $scope.csvService = responce
                        .selectFill('nID ; sName ; sSubjectOperatorName')
                        .selectNotValue('nID', undefined);
                    $scope.progres.val += 25;
                });

            new tableCSCtoJSON(branch, "ServiceData")
                .then(function (responce) {
                    $scope.csvServiceData = responce
                        .selectNotValue('nID', undefined)
                        .selectFill('nID_Service;nID_Place;nID_City;nID_Region;oData;bHidden;bTest')
                        .selectValue('bTest', 'false')
                        .selectValue('bTest', 'false')
                        .selectLengthLimitValues('oData', '>=10');
                    $scope.progres.val += 25;
                });
        }


        $scope.curBranch = $scope.branchs[3];


        $scope.LoadGitHubTable = function () {
            $scope.init($scope.curBranch.value);
        }

        $scope.visionMain = {};


        $scope.progres = {
            val: 0,
            act: true
        };

        $scope.ClearTable = function () {
            $scope.csvPlace = {};
            $scope.csvRegion = {};
            $scope.csvService = {};
            $scope.csvServiceData = {};
        }

        //сервис дата Регион
        $scope.getPlaceServiceData = function (curRegion) {
            var IDUA = parseInt(curRegion.sID_UA.substr(1, curRegion.sID_UA.length - 2), 10);
            var selPlace = $scope.csvPlace.clone().selectRange('sID_UA', IDUA, 100000000 + IDUA);
            return $scope.csvServiceData.clone().selectIntersectionFill('nID_City', selPlace, 'nID');
        }

        //сервис дата Регион
        $scope.getServiceDataForRegion = function (curRegion) {
            var IDUA = parseInt(curRegion.sID_UA.substr(1, curRegion.sID_UA.length - 2), 10);
            var selPlace = $scope.csvPlace.clone().selectRange('sID_UA', IDUA, 100000000 + IDUA);
            //сервис даты Область + Украина
            var allRegionServiseDataPrev = $scope.csvServiceData.clone().selectValue('nID_City', 'NULL');

            var placeSD = $scope.csvServiceData.clone().selectIntersectionFill('nID_City', selPlace, 'nID');
            ////сервис дата Область
            var regionSD = allRegionServiseDataPrev.clone().selectValue('nID_Region', curRegion.nID);
            ////сервис даты Украины
            var uaSD = allRegionServiseDataPrev.clone().selectValue('nID_Region', 'NULL');
            //добавление к Украине области
            var all = uaSD.clone().addCollection(regionSD).addCollection(placeSD);

            return {
                placeSD: placeSD,
                //сервис дата Область
                regionSD: regionSD,
                //сервис даты Украины
                uaSD: regionSD,
                all: all
            }
        }

        //удаление тестовых услуг
        $scope.getNotTestService = function () {
            var service = $scope.csvService.clone().selectNotValue('sSubjectOperatorName', 'Тестова служба');
            for (var i = 0; i < service.csv.length; i++) {
                if (service.csv[i].sName.substr(0, 1) == '_') {
                    service.csv.splice(i, 1);
                    i--;
                }
            }
            return service;
        }


        $scope.getResult = function () {

            var nID_ServiceNotTest = $scope.getNotTestService().clone().getColumnCollect('nID');

            var serviceData = $scope.csvServiceData.clone()
                    .selectIntersectionFill('nID_Service', nID_ServiceNotTest, 'nID');

            var place = $scope.csvPlace.clone();
            var region = $scope.csvRegion.clone();


            //получаем уникальные ID городов/областей/Украины
            var unicAllPlace = serviceData.clone().getColumnCollect('nID_Place')
                //добавляем их в таблицу
                .addColumnCollect('nID_Place', 'nID', place, 'sID_UA;sName')
                //добавляем новую колонку для суммирование услуг по данному nID_Place и занулям ее
                .addColumnNew('numberService', 0);

            //производим подсчет услуг
            for (var i = 0; i < serviceData.csv.length; i++) {
                for (var j = 0; j < unicAllPlace.csv.length; j++) {
                    if (serviceData.csv[i].nID_Place == unicAllPlace.csv[j].nID_Place) {
                        unicAllPlace.csv[j].numberService += 1;
                        break;
                    }
                }
            }


            var regionService = [];

            for (var i = 0; i < region.csv.length; i++) {
                var curReg = {
                    nID: region.csv[i].nID,
                    sName: region.csv[i].sName,
                    sID_UA: parseInt(region.csv[i].sID_UA.substr(1, region.csv[i].sID_UA.length - 2), 10),
                    nID_Place: 0,
                    numberService: 0,
                    places: []
                }
                regionService.push(curReg);
            }

            for (var i = 0; i < unicAllPlace.csv.length; i++) {
                for (var j = 0; j < regionService.length; j++) {
                    if (unicAllPlace.csv[i].sID_UA == regionService[j].sID_UA) {
                        regionService[j]['nID_Place'] = unicAllPlace.csv[i].nID_Place;
                        regionService[j]['numberService'] = unicAllPlace.csv[i].numberService;
                        break;
                    } else if ((unicAllPlace.csv[i].sID_UA > regionService[j].sID_UA) &&
                        (unicAllPlace.csv[i].sID_UA < (regionService[j].sID_UA + 100000000))) {
                        regionService[j]['places'].push(unicAllPlace.csv[i]);
                        break;
                    }
                }
            }

            //соритируем по областям
            var sortCity = {
                numberService: serviceData.clone().selectValue('nID_Place', 'NULL').csv.length,
                region: regionService
            };

            console.log(sortCity);

            $scope.visionMain = sortCity;

        }
        
        //первичная инициализация, запуск автозаполнения
        $scope.init($scope.curBranch.value);
    });