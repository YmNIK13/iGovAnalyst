/// <reference path="../../../lib/angular.min.js" />

angular.module("App")
    .controller("CtrlTest", function ($scope, $http, $filter, tableCSCtoJSON) {

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


        $scope.mainTable = "/app/analystApps/serviceRegionTest/view/mainTable.html";
        $scope.otherTable = "/app/analystApps/serviceRegionTest/view/otherTable.html";

        $scope.testTable = "/app/analystApps/serviceRegionTest/view/testTable.html";



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

        $scope.$watch('csvRegion', function UpdateData(newValue, oldValue) {

            if (newValue != oldValue) {

                console.log($scope.alldata);
                $scope.alldata = {
                    Place: $scope.csvPlace,
                    Region: $scope.csvRegion,
                    Service: $scope.csvService,
                    ServiceData: $scope.csvServiceData
                }

                var progr = 0;

                console.log($scope.alldata);

                if (angular.isObject($scope.alldata)) {
                    if (angular.isObject($scope.alldata.Place.csv)) {
                        progr += 25;
                    }
                    if (angular.isObject($scope.alldata.Service.csv)) {
                        progr += 25;
                    }
                    if (angular.isObject($scope.alldata.ServiceData.csv)) {
                        progr += 25;
                    }
                    if (angular.isObject($scope.alldata.Region.csv)) {
                        $scope.curRegion = $scope.csvRegion.csv[19];
                        progr += 25;
                    }

                }

                console.log(progr);
                $scope.progres.val = progr;

                if (progr == 100) {
                    $scope.progres.act = false;
                }
            }
        });


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
            var uaSD = allRegionServiseDataPrev.clone().selectValue('nID_Place', 'NULL');
            //добавление к Украине области
            var all = uaSD.clone().addCollection(regionSD)
            all.addCollection(placeSD);

            return {
                placeSD: placeSD,
                //сервис дата Область
                regionSD: regionSD,
                //сервис даты Украины
                uaSD: uaSD,
                all: all,
                allReg: allRegionServiseDataPrev
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

        $scope.getFile = function () {

            $scope.urlTable = $scope.otherTable;

            //сервис даты Область + Украина
            var allRegionServiseDataPrev = $scope.csvServiceData.clone().selectValue('nID_City', 'NULL');

            ////сервис даты Украины
            var allRegionServiseData = allRegionServiseDataPrev.clone().selectValue('nID_Region', $scope.curRegion.nID);

            ////сервис дата Область
            var regionServiceData = allRegionServiseDataPrev.clone().selectValue('nID_Region', 'NULL');

            //добавление к Украине области
            var all = allRegionServiseData;

            var IDUA = parseInt($scope.curRegion.sID_UA.substr(1, $scope.curRegion.sID_UA.length - 2), 10);
            var selPlace = $scope.csvPlace.clone().selectRange('sID_UA', IDUA, 100000000 + IDUA);

            //сервис дата Регион
            var placeServiceData = $scope.csvServiceData.clone().selectIntersectionFill('nID_City', selPlace, 'nID');
            //добавление региона
            all.addCollection(regionServiceData).addCollection(placeServiceData);

            //сортировка
            var placeServiceData1 = all.clone().allSorting('nID_Service');


            //номера усгул
            var numService2 = placeServiceData1.clone().selectFill('nID_Service').allSorting('nID_Service').deleteDublicate('nID_Service');

            //удаляем тестовые услуги
            var serviceNotTest = $scope.csvService.clone().selectNotValue('sSubjectOperatorName', 'Тестова служба');

            //услуги
            var cerviceTable = serviceNotTest.clone().selectIntersectionFill('nID', numService2, 'nID_Service');

            //resultheaderTable["0Название"] = "Название";
            //for (var i = 0; i < placeTable.length; i++) {
            //    headerTable[ (i+1)+ placeTable[i]] = placeTable[i];
            //}

            //var resultcsvTable = [];


            //добавляем всеУкраинские

            //номера усгул
            var numService0AllUA = all.clone().selectFill('nID_Service').allSorting('nID_Service').deleteDublicate('nID_Service');

            var serviceNotTestAllUA = $scope.csvService.clone().selectNotValue('sSubjectOperatorName', 'Тестова служба');
            //услуги
            var cerviceTableAllUA = serviceNotTest.clone().selectIntersectionFill('nID', numService2, 'nID_Service');


            //for (var j = 0; j < cerviceTable.csv.length; j++) {
            //    var resrow = [];
            //    //добавляем название
            //    resrow["0Название"] = cerviceTable.csv[i];

            //    allRegionServiseData


            //    //var sortServiceDataResult
            //}


            // */

            $scope.visionMain =

                $scope.getServiceDataForRegion($scope.curRegion).uaSD;
            //placeServiceData;

            console.log($scope.getServiceDataForRegion($scope.curRegion))

        }
        //placeSD: placeSD,
        ////сервис дата Область
        //regionSD: regionSD,
        ////сервис даты Украины
        //uaSD: regionSD,
        //all: all,
        //allReg: allRegionServiseDataPrev




        //отображение прогресс
        function watchProgress() {
            $scope.urlTable = $scope.otherTable;
            $scope.progres.val = 0;
            $scope.progres.act = true;
            RefreshTable();
        }

        $scope.$watch('curBranch', watchProgress);
        $scope.$watch('curFileName', watchProgress);

        function RefreshTable() {
            if (angular.isDefined($scope.curFileName)) {

                $scope.progres.val = 50;
                switch ($scope.curFileName.value) {

                    case "Place":
                        $scope.visionMain = $scope.csvPlace;
                        break;

                    case "Region":
                        $scope.visionMain = $scope.csvRegion;
                        break;

                    case "Service":
                        $scope.visionMain = $scope.csvService;
                        break;

                    case "ServiceData":
                        $scope.visionMain = $scope.csvServiceData;
                        break;

                    default:
                        $scope.csvPlace = {};
                }

                $scope.progres.val = 100;
                $scope.progres.act = false;
            }
        }



        //первичная инициализация, запуск автозаполнения
        //$scope.init($scope.curBranch.value);
    });