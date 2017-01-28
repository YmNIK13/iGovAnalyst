//'use strict';

//работа с данными в таблицах из GitHub
angular.module('getDataServices', [])
    .provider("getDataService", function () {

        //текущая ветвь
        var curBranch = "master";

        //локальные данные
        var _data = {};

        var _nameTabls = [];

        var _data0 = {};

        //парыук из CSV в JSON
        function CSVtoJSON(response) {
            var regGarbage = '(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)';
            //разбиваем полученный файл на строки
            var csvMas = response.split(new RegExp('\n' + regGarbage));

            //формируем заголовок
            var csvHead = csvMas[0].split(';');
            var jsonHead = {};
            for (var i = 0; i < csvHead.length; i++) {
                jsonHead[csvHead[i]] = csvHead[i];
            }
            //формируем тело
            var jsonBody = [];
            var counColmn = csvHead.length;

            for (var i = 1; i < csvMas.length; i++) {
                //под новый JSON
                var completeObj = {};
                //текущая строка, делим на ячейки и удаляем лишние кавычки
                var currentRow = csvMas[i].split(';');
                //проверяем соответвует ли количество колонок
                if (counColmn === currentRow.length) {
                    //создаем объект JSON
                    for (var j = 0; j < csvHead.length; j++) {
                        completeObj[csvHead[j]] = currentRow[j];
                    }
                }
                //добавляем в коллекцию
                jsonBody.push(completeObj);
            }

            return resultJSON = {
                csv: jsonBody,
                header: jsonHead,
                separator: ';'
            };
        }
        //получение таблицы CSV с gitHub
        function getTableGitHub($http, nameTable) {
            if (angular.isDefined(curBranch) && angular.isDefined(nameTable)) {
                var promise = $http.get("https://raw.githubusercontent.com/e-government-ua/i/"
                    + curBranch + "/wf-central/src/main/resources/data/"
                    + nameTable + ".csv").success(function (response) {
                    }).then(function myfunction(response) {
                        response['nameTable'] = nameTable;
                        return response;
                    });
                return promise;
            } else {
                return {};
            }
        }

        function parserssss(response) {
            //console.log("скачали новую таблицу " + response.nameTable);
            var newJSON = {};
            newJSON['data'] = CSVtoJSON(response.data);
            newJSON['nameTable'] = response.nameTable;
            return newJSON;
        }

        function addtable(response) {
            //console.log("добавили таблицу " + response.nameTable);
            _data[response.nameTable] = response.data;
            return _data;
        }

        function saveTable(response) {
            //console.log("Сохранил таблицы");
            //console.log(response);
            SaveStorageTable(response);
            return response;
        }

        function fulfilledService(response) {

            foo(response);
        }
        var foo;

        //загрузка данных
        function LoadGitHubTable($http) {
            var prom = {};
            for (var i = 0; i < _nameTabls.length; i++) {
                prom = getTableGitHub($http, _nameTabls[i]).then(parserssss).then(addtable).then(saveTable)//.then(fulfilledService);
            }

            prom.then(fulfilledService);
        }
        //загрузка с локального источника
        function LoadStorageTable() {
            if (curBranch != "") {
                var temp = window.localStorage[curBranch];

                if (!temp) {
                    _data = {};
                    return false;
                } else {
                    _data = JSON.parse(temp);
                    return true;
                }
            } else {
                return false;
            }
        }
        //сохранение на локальный источник
        function SaveStorageTable(_branch) {
            if (curBranch != "" && angular.isDefined(_data)) {
                this.data = _branch;

                // второй параметр - функция, которая удаляет специальное свойство добавляемое angularJS для отслеживания дубликатов 
                // http://mutablethought.com/2013/04/25/angular-js-ng-repeat-no-longer-allowing-duplicates/
                window.localStorage[curBranch] = JSON.stringify(_branch, function (key, val) {
                    if (key == '$$hashKey') {
                        return undefined;
                    }
                    return val
                });
            }
        }
        //выбор конкретных таблиц

        function setNameTables(nameTables) {
            var newNames = [];
            var masNametables = nameTables.split(';');
            //удаляем лишние пробелы
            for (var i = 0; i < masNametables.length; i++) {
                newNames.push(masNametables[i].replace(/^\s*|\s*$/g, ""));
            }
            return newNames;
        }

        function takeTables() {

            var newTables = {};

            var selTables = _nameTabls;
            //удаляем лишние пробелы
            for (var i = 0; i < selTables.length; i++) {
                if (angular.isDefined(_data[selTables[i]])) {
                    newTables[selTables[i]] = _data[selTables[i]];
                } else {
                    newTables[selTables[i]] = {};
                }
            }
            console.log("takeTables");
            console.log(newTables);
            foo(newTables);
            return newTables;
        }

        //ответ сервиса
        return {
            //указать ветку
            getBranch: function (branch) {
                if (angular.isDefined(branch)) {
                    curBranch = branch;
                    return this;
                } else {
                    return curBranch;
                }
            },
            setTables: function (nameTables) {
                if (angular.isDefined(nameTables)) {
                    _nameTabls = setNameTables(nameTables);
                    return this;
                } else {
                    return _nameTabls;
                }
            },
            //непосредственно ответ
            $get: function ($http) {
                return {
                    data: _data, //все таблицы
                    getTables: function (fulfilled) { //конкретные таблицы
                        foo = fulfilled;

                        if (!LoadStorageTable()) {
                            LoadGitHubTable($http);
                        }
                        else {
                            takeTables();
                        }

                        return _data;
                    },
                    getBranch: function (branch, fulfilled) {
                        if (angular.isDefined(branch)) {

                            foo = fulfilled;
                            curBranch = branch;
                            if (!LoadStorageTable()) {
                                LoadGitHubTable($http);
                            }
                            else {
                                takeTables();
                            }
                            return this;
                        } else {
                            return curBranch;
                        }
                    }
                };
            }
        }
    });