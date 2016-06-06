'use strict';

var Promise = require("bluebird");
var _ = require("underscore");

var User = require('../models/user');

var OperationalNumber = require('../models/psquare/op-number');
var SpiritLevel = require('../models/psquare/spirit-level');
var Destiny = require('../models/psquare/destiny');
var InteriorVibration = require('../models/psquare/int-vibration');
var ExteriorVibration = require('../models/psquare/ext-vibration');
var CosmicVibration = require('../models/psquare/cosmic-vibration');

var GeneralNumbers = require('../models/psquare/general');
var Line = require('../models/psquare/lines');
var LineWeight = require('../models/psquare/lines-weight');

var SquareMeaning = require('../models/psquare/sq-meaning');
var SquareCombo = require('../models/psquare/sq-combo');

var dataRetriever = function (utils, digits, response) {
    function getUser(analystId) {
        return User
            .find({analystId: analystId})
            .exec()
            .then(function (data) {
                return data[0];
            });
    }


    function getSpiritLevel(result, level) {
        var spiritPromise = SpiritLevel.find({
            "min": {
                $lte: level
            },
            "max": {
                $gte: level
            }
        }).exec();

        return spiritPromise.then(function (spiritLevel) {
            result.spiritLevel = spiritLevel[0];
        });
    }

    function getDestiny(result, destinyNumber) {
        return Destiny
            .find({number: destinyNumber})
            .exec()
            .then(function (data) {
                result.destiny = data[0];
            });
    }

    function getInteriorVibration(result) {
        return InteriorVibration
            .find({number: utils.getDaySum()})
            .exec()
            .then(function (data) {
                result['interior vibration'] = data[0];
            });
    }

    function getExteriorVibration(result) {
        return ExteriorVibration
            .find({number: utils.getMonthSum()})
            .exec()
            .then(function (data) {
                result['exterior vibration'] = data[0];
            });
    }

    function getCosmicVibration(result) {
        return CosmicVibration
            .find({number: utils.getCosmicVibration()})
            .exec()
            .then(function (data) {
                result['cosmic vibration'] = data[0];
            });
    }

    function getOpDigitsDescriptions(op) {
        var opPromise = OperationalNumber.find().exec();

        return opPromise.then(function (operationalNumbers) {
            for (var i = 0; i < op.length; i++) {
                op[i].details = operationalNumbers[i];
            }
        });
    }

    function getSqMeaning(resultSqMeaning, digit, count) {
        var promise = SquareMeaning.find({
            "number": digit,
            "min": {$lte: count},
            "max": {$gte: count}
        }).exec();

        return promise.then(function (sqMeaning) {
            resultSqMeaning[digit] = sqMeaning;
        });
    }

    function getCombos(result) {
        var digits = result.digits;
        // As we can't match the whole onto the part, we have to pull
        // all the combos and match the combo over the whole
        return SquareCombo
            .find()
            .exec()
            .then(function (allCombos) {
                var matchingCombos = [];
                var len = _.size(allCombos);
                for (var i = 0; i < len; i++) {
                    var combo = allCombos[i];
                    if (digits.comboMatchesSquare(combo)) {
                        matchingCombos.push(combo);
                    }
                }
                result['sq combos'] = matchingCombos;
                return matchingCombos;
            });
    }

    function getLineWeight(lineName, result) {
        var lWeight = digits.getLineWeight(lineName);
        return LineWeight
            .find({
                line: lineName,
                "min": {$lte: lWeight.count},
                "max": {$gte: lWeight.count}
            })
            .exec()
            .then(function (lineWeight) {
                result[lineName] = _.isUndefined(lineWeight[0]) ?
                {
                    line: lineName
                } : lineWeight[0].toObject();
                result[lineName].weight = lWeight;
            });
    }

    function getLines(result) {
        return Line
            .find()
            .exec()
            .then(function (data) {
                result.lines = {};
                for (var i = 0; i < data.length; i++) {
                    result.lines[data[i].line] = data[i];
                }
            });
    }

    function getNumbers(result) {
        return GeneralNumbers
            .find()
            .exec()
            .then(function (data) {
                result.generalDigits = data;
            });
    }

    function postProcessing(result) {
        result.priorities = [];
        _.each(result.linesWeight, function (lw) {
            result.priorities.push({
                weight: lw.weight.sum,
                title: result.lines[lw.line].name,
                number: lw.line
            });
        });
        _.each(result.generalDigits, function (gd) {
            result.priorities.push({
                weight: digits.getLineWeight(gd.number).sum,
                title: gd.title,
                number: gd.number
            });
        });

        return result;
    }

    function aggregate(resultData, op, userLevel) {
        var promises = [];

        promises.push(getSpiritLevel(resultData, op[0].number));
        promises.push(getOpDigitsDescriptions(op));
        promises.push(getDestiny(resultData, utils.sumDigits(op[1].number)));

        if (userLevel >= 3) {
            promises.push(getInteriorVibration(resultData));
            promises.push(getExteriorVibration(resultData));
            promises.push(getCosmicVibration(resultData));
        }

        if (userLevel >= 5) {
            promises.push(getLines(resultData));
            promises.push(getCombos(resultData));
            promises.push(getNumbers(resultData));

            var digits = resultData.digits;
            var digitLen = digits.length;
            // Start from 1, as we don't have 0 yet
            resultData.sqMeaning = [];
            for (var i = 1; i < digitLen; i++) {
                var digit = digits.get(i);
                promises.push(getSqMeaning(resultData.sqMeaning, digit.id, digit.count));
            }

            var lines = [
                '123', '456', '789',
                '147', '258', '369',
                '159', '357'
            ];
            resultData.linesWeight = {};
            for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                var lineName = lines[lineIndex];
                // We push down the line index, because for some lines
                // some intervals have no descriptions
                promises.push(
                    getLineWeight(lineName, resultData.linesWeight)
                );
            }
        }

        Promise.all(promises).then(function () {
            // All DB queries are finished - returning the result
            resultData = postProcessing(resultData);
            response.json(resultData);
        });
    }

    function getAllInto(resultData, op, userLevel) {
/*
        getUser(analystId)
            .then(function (user) {
                var userLevel = _.isUndefined(user) ? 1 : user.level;
*/
                aggregate(resultData, op, userLevel);
            //});
    }

    return {
        aggregate: aggregate,
        getAllInto: getAllInto
    };
};

module.exports = dataRetriever;