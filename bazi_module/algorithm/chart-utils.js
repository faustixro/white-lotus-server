'use strict';

let moment = require('moment-timezone');
let _ = require('lodash');

let utils = function () {
    function getVisibleStems(chart) {
        let result = [
            chart.year.hs,
            chart.month.hs,
            chart.day.hs
        ];
        if (!_.isUndefined(chart.hour)) {
            result.push(chart.hour.hs);
        }
        return result;
    }

    function getNormalLifeTypeStem(chart) {
        let result;
        let seasonHidStems = chart.month.hidStems;
        let stems = getVisibleStems(chart);

        if (_.indexOf(stems, seasonHidStems[0]) > -1) {
            result = seasonHidStems[0];
        }

        if (_.isUndefined(result) && _.indexOf(stems, seasonHidStems[1]) > -1) {
            result = seasonHidStems[1];
        }
        result = _.isUndefined(result) ? seasonHidStems[0] : result;
        return result;
    }

    function getGods(dm) {
        let yangGodsList = ['F', 'RW', 'EG', 'HO', 'IW', 'DW', 'DO', '7K', 'IR', 'DR'];
        let yinGodsList = ['F', 'HO', 'EG', 'DW', 'IW', '7K', 'DO', 'DR', 'IR', 'RW'];
        let dmIsYang = dm.indexOf('+') > 0;
        let stems = getStems();
        let dmIndex = _.indexOf(stems, dm);

        let associations = {};

        for (let i = 0; i < 10; i++) {
            associations[stems[dmIndex]] =
                dmIsYang ?
                    yangGodsList[i] :
                    yinGodsList[i];
            dmIndex = (++dmIndex) % 10;
        }

        return associations;
    }

    function getStems() {
        return ["癸 A-", "甲 L+", "乙 L-", "丙 F+", "丁 F-", "戊 P+", "己 P-",
            "庚 M+", "辛 M-", "壬 A+", "癸 A-"];
    }

    function getBranches() {
        return ["亥 hài", "子 zǐ", "丑 chǒu", "寅 yín", "卯 mǎo", "辰 chén", "巳 sì",
            "午 wǔ", "未 wèi", "申 shēn", "酉 yǒu", "戌 xū", "亥 hài", "子 zǐ"]
    }

    function isStem(itemName) {
        return _.includes(getStems(), itemName);
    }

    function isBranch(itemName) {
        return _.includes(getBranches(), itemName);
    }

    return {
        getVisibleStems: getVisibleStems,
        getNormalLifeTypeStem: getNormalLifeTypeStem,
        getGods: getGods,

        getStems: getStems,
        isStem: isStem,

        getBranches: getBranches,
        isBranch: isBranch
    };
};

module.exports = utils;