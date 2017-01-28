/// <reference path="../../lib/angular-1.6.1/angular.min.js" />

angular.module("App")
    .controller("serviceRegionCtrl", function ($scope, $http, $filter, tableCSCtoJSON) {

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
                    $scope.csvRegion = responce;
                    $scope.progres.val += 25;
                });

           new tableCSCtoJSON(branch, "Place")
                .then(function (responce) {
                    $scope.csvPlace = responce.selectFill('nID ; sID_UA ; sName');
                    $scope.progres.val += 25;
                });

            new tableCSCtoJSON(branch, "Service")
                .then(function (responce) {
                    $scope.csvService = responce.selectFill('nID ; sName ; sSubjectOperatorName');
                    $scope.progres.val += 25;
                });

            new tableCSCtoJSON(branch, "ServiceData")
                .then(function (responce) {
                    $scope.csvServiceData = responce
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

        $scope.getResult = function () {
            $scope.urlTable = $scope.mainTable;

            //$scope.urlTable = $scope.testTable;

            //var curTable = [];
            //var rowHead = ["Відповідальний орган", "Назва послуги"];


            var SD = $scope.getServiceDataForRegion($scope.curRegion)


            /*----------------------------------------------------------*/
            /*--------------              Шапка         ----------------*/
            /*----------------------------------------------------------*/

            //города
            var placeTable = $scope.csvPlace.clone().selectIntersectionFill('nID',
                //вытаскиваем перечень ID городов
                SD.placeSD.clone().getColumnCollect('nID_City'),
                'nID_City').csv;

            var headPlaceTable = [];
            for (var i = 0; i < placeTable.length; i++) {
                headPlaceTable[i] = placeTable[i];
            }

            /*----------------------------------------------------------*/
            /*--------------            Тело            ----------------*/
            /*----------------------------------------------------------*/
            /*--------------      Первая колонка        ----------------*/

            //услуги
            var cerviceTable = $scope.csvService.clone()
                //удаляем тестовые услуги
                .selectNotValue('sSubjectOperatorName', 'Тестова служба')
                .selectIntersectionFill('nID',
                //передаем коллекцию нормеров услуг
                SD.all.clone().getColumnCollect('nID_Service'),
                'nID_Service').csv;

            //формируем результирующую таблицу
            var bodyService = [];
            for (var i = 0; i < cerviceTable.length; i++) {

                //текущая строке регионов привязанных к услуге
                var rowCur = [];
                for (var j = 0; j < placeTable.length; j++) {
                    var curCell = {
                        nID_Place: placeTable[j]["nID"],
                        sID_UA: placeTable[j]["sID_UA"],
                        region: null,
                        flag: false
                    };
                    rowCur.push(curCell);
                }
                bodyService.push({
                    firstColumn: cerviceTable[i],//коллекция названий услуг
                    bodyColumn: rowCur //коллекция полей городов
                });
            }




            /*--------------        Услуги          ----------------*/


            //коллекция Сервис даты для городов ограниченная двумя полями 
            var masSDPlaceCut = SD.placeSD.clone().selectFill("nID_City;nID_Service");
            // массив ID услуг 
            var masServicePlace = masSDPlaceCut.clone().getColumnCollect('nID_Service').csv;

            for (var i = 0; i < masServicePlace.length; i++) {//перебираем услуги
                for (var j = 0; j < bodyService.length; j++) {//перебираем результирующую таблицу
                    //ищем в нашей результирующей таблице нужную услугу из услуг НА ГОРОД
                    if (bodyService[j].firstColumn.nID == masServicePlace[i].nID_Service) {
                        bodyService[j].firstColumn["region"] = "city";
                        //вытаскием список городов который связан с услугой
                        var masServiceByPlace = masSDPlaceCut.clone().selectValue('nID_Service', masServicePlace[i].nID_Service).csv;
                        for (var n = 0; n < masServiceByPlace.length; n++) {
                            for (var m = 0; m < bodyService[j].bodyColumn.length; m++) {
                                //ищем нужный город в нужной услуге
                                if (masServiceByPlace[n].nID_City == bodyService[j].bodyColumn[m].nID_Place) {
                                    bodyService[j].bodyColumn[m].flag = true;
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }

            //коллекция Сервис даты для ОБЛАСТЕЙ ограниченная двумя полями 
            var masSDRegionCut = SD.regionSD.clone().selectFill("nID_Service");
            //console.log(masSDRegionCut);
            var masServiceRegion = masSDRegionCut.clone().getColumnCollect('nID_Service').csv;

            for (var i = 0; i < masServiceRegion.length; i++) {//перебираем услуги
                for (var j = 0; j < bodyService.length; j++) {//перебираем результирующую таблицу
                    //ищем в нашей результирующей таблице нужную услугу из услуг НА ОБЛАСТЬ
                    if (bodyService[j].firstColumn.nID == masServiceRegion[i].nID_Service) {
                        bodyService[j].firstColumn["region"] = "region";
                        //вытаскием список городов который связан с услугой
                        var masServiceByPlace = masSDRegionCut.clone().selectValue('nID_Service', masServiceRegion[i].nID_Service).csv;
                        for (var n = 0; n < masServiceByPlace.length; n++) {
                            for (var m = 0; m < bodyService[j].bodyColumn.length; m++) {
                                bodyService[j].bodyColumn[m].flag = true;
                            }
                        }
                        break;
                    }
                }
            }

            //коллекция Сервис даты для ВСЕЙ УКРАИНЫ ограниченная двумя полями 
            var masSDUACut = SD.uaSD.clone().selectFill("nID_Service");
            var masServiceUA = masSDUACut.clone().getColumnCollect('nID_Service').csv;

            for (var i = 0; i < masServiceUA.length; i++) {//перебираем услуги
                for (var j = 0; j < bodyService.length; j++) {//перебираем результирующую таблицу

                    //ищем в нашей результирующей таблице нужную услугу из услуг НА ВСЮ УКРАИНУ
                    if (bodyService[j].firstColumn.nID == masServiceUA[i].nID_Service) {
                        bodyService[j].firstColumn["region"] = "ua";
                        //вытаскием список городов который связан с услугой
                        var masServiceByPlace = masSDUACut.clone().selectValue('nID_Service', masServiceUA[i].nID_Service).csv;
                        for (var n = 0; n < masServiceByPlace.length; n++) {
                            for (var m = 0; m < bodyService[j].bodyColumn.length; m++) {
                                bodyService[j].bodyColumn[m].flag = true;
                            }
                        }
                        break;
                    }
                }
            }




            var result = {
                header: {
                    cities: headPlaceTable
                },
                body: bodyService
            }


            console.log(result);

            $scope.visionMain = result;

        }




        //первичная инициализация, запуск автозаполнения
        $scope.init($scope.curBranch.value);
    });