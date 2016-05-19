'use strict';

var Utils = require('./age');
var BaZiCalculator = require('./bazi-calculator');
var Retriever = require('./data-retriever');
var _ = require("underscore");

var baziModule = function (person, response) {
    if(person === null || person === undefined) {
        return;
    }

    var utils = Utils(person.date);
    var retriever = Retriever(response);

    function calculate() {
        var chartData = BaZiCalculator(person).compute();
        var resultData = {
            name: person.name,
            surname: person.surname,
            age: utils.getAge(),
            analysis: {},
            age_string: utils.getAgeString(),
            sex: person.sex,

            chart: chartData,
            dm: {}
        };

        //console.log(person);
        /*console.log(resultData.chart);*/
        // Append data about phases, hs, eb to the result.
        // All these are appended based on the fact
        // that eventually all appear in chart/analysis
        retriever.getAllInto(resultData);
    }

    calculate();
};

module.exports = baziModule;