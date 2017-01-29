//'use strict';

angular.module('TableCsvModule', [])
    .factory('tableCSCtoJSON', ['$filter', '$http', '$q', function ($filter, $http, $q) {
        function tableCsv(_branch, _nameTable,  _flag) {
            if (angular.isString(_branch) && angular.isString(_nameTable)) {
                this.setBranch({ _branch: _branch });
                this.setNameTable({ _nameTable: _nameTable });
                if (!_flag) {
                    return this.init();
                }
                
            }
        };


        //чтение таблицы
        function GetTableGitHub(scope) {
            if (angular.isDefined(scope._branch) && angular.isDefined(scope._nameTable)) {
                var promise = $http.get("https://raw.githubusercontent.com/e-government-ua/i/"
                    + scope._branch + "/wf-central/src/main/resources/data/"
                    + scope._nameTable + ".csv")
                    //.success(function (response) { })
                    .then(function myfunction(response) {
                        response['scope'] = scope;
                        return response;
                    });
                return promise;
            } else {
                return {};
            }
        }
        //парсинг из CSV в JSON
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

            return {
                csv: jsonBody,
                header: jsonHead,
                separator: ';'
            };
        }
        //загрузка с локального источника
        function LoadStorageTable(nameJSON) {
            if (nameJSON != "") {
                var temp = window.localStorage[nameJSON];
                var _data = null;
                if (temp) _data = JSON.parse(temp);
                return _data;
            } else {
                return null;
            }
        }
        //Сохранение JSON в StorageTable
        function SaveStorageTable(response) {
            if (response.scope._branch != "" && response.scope._nameTable != "" && angular.isDefined(response.data)) {
                var nameJSON = response.scope._branch + "-" + response.scope._nameTable;
                var dataJSON = response.data;

                // второй параметр - функция, которая удаляет специальное свойство добавляемое angularJS для отслеживания дубликатов 
                // http://mutablethought.com/2013/04/25/angular-js-ng-repeat-no-longer-allowing-duplicates/
                window.localStorage[nameJSON] = JSON.stringify(dataJSON, function (key, val) {
                    if (key == '$$hashKey') {
                        return undefined;
                    }
                    return val
                });
            }
        }
        //promice функция парсинга
        function Parser(response) {
            var newJSON = {};
            newJSON['data'] = CSVtoJSON(response.data);
            newJSON['scope'] = response.scope;
            return newJSON;
        }
        //promice функция добавление 
        function Addtable(response) {
            console.log("Load global: " + response.scope._nameTable + " (" + response.scope._branch + ")");
            response.scope.setData(response.data);
            return response;
        }
        //promice функция сохранения
        function SaveTable(response) {
            SaveStorageTable(response);
            return response.scope;
        }




        tableCsv.prototype = {
            //клонируем объект
            clone: function () {
                return new tableCsv(this._branch, this._nameTable, true).setData(this);
            },

            init: function () {
                //питаемся получить таблицу с локального источника
                var nameJSON = this._branch + "-" + this._nameTable;
                var dataJSON = LoadStorageTable(nameJSON);

                if (dataJSON != null) {
                    //console.log("Load local: " + this._nameTable + " (" + this._branch + ")");
                    this.setData(dataJSON);
                    var deferred = $q.defer();
                    deferred.resolve(this);
                    return deferred.promise;
                } else {
                    return GetTableGitHub(this).then(Parser).then(Addtable).then(SaveTable);
                }
            },

            setBranch: function (dataCSV) {
                angular.extend(this, dataCSV);
                return this;
            },

            setNameTable: function (dataCSV) {
                angular.extend(this, dataCSV);
                return this;
            },

            setData: function (dataCSV) {
                angular.extend(this, dataCSV);
                return this;
            },
            /**  
                @type {object} ограничение коллеции до указанных полей
            */
            selectFill: function (nameCols) {
                this.header = $filter('changFillHeadFilter')(this.header, nameCols);
                this.csv = $filter('changFillBodyFilter')(this.csv, nameCols);
                return this;
            },

            /** @description Получение коолекции строк по значению поля
             * @param {string} навание поля
             * @param {string} значение
             * @return {object}  коллекция строк
             */
            selectValue: function (nameCol, value) {
                this.csv = $filter('flagFilter')(this, nameCol, value).csv;
                return this;
            },
            selectNotValue: function (nameCol, value) {
                this.csv = $filter('antiFlagFilter')(this, nameCol, value).csv;
                return this;
            },
            selectLengthLimitValues: function (nameCol, value) {
                this.csv = $filter('lengthFilter')(this, nameCol, value).csv;
                return this;
            },
            selectRange: function (nameCol, valMin, valMax) {
                this.csv = $filter('rangeFilter')(this, nameCol, valMin, valMax).csv;
                return this;
            },
            //фильтр сортировки смешанных значений
            allSorting: function (nameColData) {
                this.csv = $filter('allSorting')(this, nameColData).csv;
                return this;
            },
            //фильтр выбор определенных полей по массиву
            selectIntersectionFill: function (nameColData, arrayRestriction, nameColArray) {
                this.csv = $filter('intersectionFillFilter')(this, nameColData, arrayRestriction, nameColArray).csv;
                return this;
            },
            //фильтр удаление дубликатов
            deleteDublicate: function (nameColData) {
                this.csv = $filter('deleteDublicateFilter')(this, nameColData).csv;
                return this;
            },
            //добавление к существующей коллекции
            addCollection: function (regionServiceData) {
                for (var i = 0; i < regionServiceData.csv.length; i++) {
                    this.csv.push(regionServiceData.csv[i]);
                }
                return this;
            },
            //получение колонки с уникальными значениями
            getColumnCollect: function (nameCol) {
                return this.selectFill(nameCol).allSorting(nameCol).deleteDublicate(nameCol);
            },
            //добавление колонки со значением
            addColumnNew: function (nameCol, value) {
                this.header[nameCol] = nameCol;
                for (var i = 0; i < this.csv.length; i++) {
                    this.csv[i][nameCol] = value;
                }
                return this;
            },
            //добавление колонки с другой таблицы (вставляется только первый входящий), где 
            //keyCol-ключ текущей таблицы, 
            //idCol - id по которому искать строку (если keyCol == idCol)
            //table - таблица откуда брать  значения
            //добавляемая колонка
            addColumnCollect: function (keyCol, idCol, table, nameCols) {

                //получаем массив новых колонок
                var selCols = nameCols.split(';');
                var nameNeedCols = '' + idCol;

                //добавляем заголовок новые колонки
                for (var i = 0; i < selCols.length; i++) {
                    //удаляем лишние пробелы
                    selCols[i] = selCols[i].replace(/^\s*|\s*$/g, "");

                    this.addColumnNew(selCols[i], 'NULL')

                    //this.header[selCols[i]] = selCols[i];
                    nameNeedCols += ';' + selCols[i]
                }

                //оптимизируем таблицу
                var tableOpt = table.clone().selectFill(nameNeedCols);
                console.log(tableOpt)
                //проводим поиск и добавляем колонку в текущую таблицу
                for (var i = 0; i < this.csv.length; i++) {
                    //значение по умолчанию
                    //for (var k  = 0; k < selCols.length; k++) {
                    //    this.csv[i][selCols[k]] = 'NULL';
                    //}
                    
                    for (var j = 0; j < tableOpt.csv.length; j++) {
                        if (tableOpt.csv[j][idCol] == this.csv[i][keyCol]) {
                            for (var n = 0; n < selCols.length; n++) {
                                //удаляем лишние пробелы
                                this.csv[i][selCols[n]] = tableOpt.csv[j][selCols[n]];
                            }                            
                            break;
                        }
                    }
                }
                return this;
            },







            load: function (id) {
                var scope = this;
                $http.get('ourserver/books/' + bookId).success(function (bookData) {
                    scope.setData(bookData);
                });
            },
            delete: function () {
                $http.delete('ourserver/books/' + bookId);
            },
            update: function () {
                $http.put('ourserver/books/' + bookId, this);
            },
            getImageUrl: function (width, height) {
                return 'our/image/service/' + this.book.id + '/width/height';
            },
            isAvailable: function () {
                if (!this.book.stores || this.book.stores.length === 0) {
                    return false;
                }
                return this.book.stores.some(function (store) {
                    return store.quantity > 0;
                });
            }
        };
        return tableCsv;
    }])
    //фильтер на соответвие
    .filter('flagFilter', function () {
        return function (dataCSV, nameCol, value) {
            if (angular.isArray(dataCSV.csv)) {
                var result = [];

                for (var i = 0; i < dataCSV.csv.length; i++) {

                    //if (eval(dataCSV.csv[i][nameCol] + value)) {
                    if (dataCSV.csv[i][nameCol] == value) {
                        result.push(dataCSV.csv[i]);
                    }
                }
                return {
                    header: dataCSV.header,
                    csv: result,
                    separator: dataCSV.separator
                }
            }
            else {
                console.warn("Фильтр flagFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтер на соответвие
    .filter('antiFlagFilter', function () {
        return function (dataCSV, nameCol, value) {
            if (angular.isArray(dataCSV.csv)) {
                var result = [];

                for (var i = 0; i < dataCSV.csv.length; i++) {

                    //if (eval(dataCSV.csv[i][nameCol] + value)) {
                    if (dataCSV.csv[i][nameCol] != value) {
                        result.push(dataCSV.csv[i]);
                    }
                }
                return {
                    header: dataCSV.header,
                    csv: result,
                    separator: dataCSV.separator
                }
            }
            else {
                console.warn("Фильтр flagFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр на длину параметра
    .filter('lengthFilter', function () {
        return function (dataCSV, nameCol, value) {
            if (angular.isArray(dataCSV.csv)) {
                var result = [];

                for (var i = 0; i < dataCSV.csv.length; i++) {
                    if (eval(dataCSV.csv[i][nameCol].length + value)) {
                        result.push(dataCSV.csv[i]);
                    }
                }

                return {
                    header: dataCSV.header,
                    csv: result,
                    separator: dataCSV.separator
                };
            }
            else {
                console.warn("Фильтр lengthFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр на диапазон
    .filter('rangeFilter', function () {
        return function (dataCSV, nameCol, valMin, valMax) {
            if (angular.isArray(dataCSV.csv) && angular.isNumber(valMin) && angular.isNumber(valMax)) {
                var result = [];

                for (var i = 0; i < dataCSV.csv.length; i++) {
                    if (dataCSV.csv[i][nameCol] >= valMin && dataCSV.csv[i][nameCol] < valMax) {
                        result.push(dataCSV.csv[i]);
                    }
                }
                return {
                    header: dataCSV.header,
                    csv: result,
                    separator: dataCSV.separator
                };
            }
            else {
                console.warn("Фильтр rangeFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр выбор определенных полей заголовка
    .filter('changFillHeadFilter', function () {
        return function (dataCSV, nameCols) {
            if (angular.isObject(dataCSV)) {
                var newjsonHead = {};
                var selCols = nameCols.split(';');
                //удаляем лишние пробелы
                for (var i = 0; i < selCols.length; i++) {
                    selCols[i] = selCols[i].replace(/^\s*|\s*$/g, "");
                    newjsonHead[selCols[i]] = selCols[i];
                }
                return newjsonHead;
            }
            else {
                console.warn("Фильтр changFillHeadFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр выбор определенных полей тела
    .filter('changFillBodyFilter', function () {
        return function (dataCSV, nameCols) {
            if (angular.isArray(dataCSV)) {
                var newjsonBody = [];
                var selCols = nameCols.split(';');
                //удаляем лишние пробелы
                for (var i = 0; i < selCols.length; i++) {
                    selCols[i] = selCols[i].replace(/^\s*|\s*$/g, "");
                }

                for (var i = 0; i < dataCSV.length; i++) {
                    var newObjJson = {};
                    for (var j = 0; j < selCols.length; j++) {
                        newObjJson[selCols[j]] = dataCSV[i][selCols[j]];
                    }
                    newjsonBody.push(newObjJson);
                }

                return newjsonBody;
            }
            else {
                console.warn("Фильтр changFillBodyFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр выбор определенных полей
    .filter('changFillFilter', function () {
        return function (dataCSV, nameCols) {
            if (angular.isArray(dataCSV.csv)) {
                var newjsonHead = {};
                var newjsonBody = [];
                var selCols = nameCols.split(';');
                //удаляем лишние пробелы
                for (var i = 0; i < selCols.length; i++) {
                    selCols[i] = selCols[i].replace(/^\s*|\s*$/g, "");
                    newjsonHead[selCols[i]] = selCols[i];
                }

                for (var i = 0; i < dataCSV.csv.length; i++) {
                    var newObjJson = {};
                    for (var j = 0; j < selCols.length; j++) {
                        newObjJson[selCols[j]] = dataCSV.csv[i][selCols[j]];
                    }
                    newjsonBody.push(newObjJson);
                }

                return {
                    csv: newjsonBody,
                    header: newjsonHead,
                    separator: dataCSV.separator
                };
            }
            else {
                console.warn("Фильтр changFillFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр сортировки смешанных значений
    .filter('allSorting', function () {
        return function (dataJson, nameColData) {
            if (angular.isArray(dataJson.csv)) {
                var newjsonBody = dataJson.csv.sort(function (a, b) {

                    var aif = parseInt(a[nameColData]);
                    var bif = parseInt(b[nameColData])

                    if (angular.isNumber(aif) && angular.isNumber(bif)) {
                        return aif - bif;
                    } else if (angular.isNumber(aif) && !angular.isNumber(bif)) {
                        return -1;
                    } else if (!angular.isNumber(aif) && angular.isNumber(bif)) {
                        return +1;
                    } else if (!angular.isNumber(aif) && !angular.isNumber(bif)) {
                        return a[nameColData].localeCompare(b[nameColData]);
                    }

                });

                return {
                    header: dataJson.header,
                    csv: newjsonBody,
                    separator: dataJson.separator
                };
            }
            else {
                console.warn("Фильтр allSorting - не сработал");
                return dataJson;
            }
        };
    })
    //фильтр выбор определенных полей по массиву
    .filter('intersectionFillFilter', function ($filter) {
        return function (dataCSV, nameColData, arrayRestriction, nameColArray) {
            if (angular.isArray(dataCSV.csv) && angular.isArray(arrayRestriction.csv)) {

                var newjsonBody = [];

                //с сортировкой
                /*
                //сортируем данные для сравнения
                var oldDataCSV = $filter('allSorting')(dataCSV, nameColData).csv;
                //удаляем лишние поля и сортируем данные

                var oldArray = $filter('changFillFilter')(arrayRestriction, nameColArray).csv.sort(function (a, b) {
                    return parseInt(a[nameColArray]) - parseInt(b[nameColArray]);
                });

                console.log(oldDataCSV);

                //сравниваем два массива
                var i = 0, j = 0;
                while (i < oldDataCSV.length && j < oldArray.length) {


                   // console.log((parseInt(oldDataCSV[i][nameColData]) + " -- "+  parseInt(oldArray[j][nameColArray])))

                    //одинаковые элементы добавляем к новый массив
                    if (oldDataCSV[i][nameColData] == oldArray[j][nameColArray]) {
                        newjsonBody.push(oldDataCSV[i]);
                    }
                    //в зависимости от сравниваемых ранее отсортированных значений повышаем тот или иной счетчик
                    (parseInt(oldDataCSV[i][nameColData]) > parseInt(oldArray[j][nameColArray])) ? j++ : i++;
                }
                // */

                var oldDataCSV = dataCSV.csv;
                var oldArray = $filter('deleteDublicateFilter')(arrayRestriction, nameColArray).csv;

                for (var i = 0; i < oldDataCSV.length; i++) {
                    for (var j = 0; j < oldArray.length; j++) {
                        //одинаковые элементы добавляем к новый массив
                        if (oldDataCSV[i][nameColData] == oldArray[j][nameColArray]) {
                            newjsonBody.push(oldDataCSV[i]);
                            break;
                        }
                    }
                }

                return {
                    header: dataCSV.header,
                    csv: newjsonBody,
                    separator: dataCSV.separator
                };
            }
            else {
                console.warn("Фильтр intersectionFillFilter - не сработал");
                return dataCSV;
            }
        };
    })
    //фильтр удаление дубликатов
    .filter('deleteDublicateFilter', function ($filter) {
        return function (dataCSV, nameColData) {
            if (angular.isArray(dataCSV.csv)) {
                var newjsonBody = [];
                for (var i = 0; i < dataCSV.csv.length; i++) {
                    var flag = true;
                    for (var j = 0; j < newjsonBody.length; j++) {
                        if (dataCSV.csv[i][nameColData] == newjsonBody[j][nameColData]) {
                            flag = false;
                            break;
                        }
                    }
                    flag ? newjsonBody.push(dataCSV.csv[i]) : flag = true;
                }
                return {
                    header: dataCSV.header,
                    csv: newjsonBody,
                    separator: dataCSV.separator
                };
            }
            else {
                console.warn("Фильтр deleteDublicateFilter - не сработал");
                return dataCSV;
            }
        };
    });





