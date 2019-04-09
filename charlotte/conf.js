_ = require('lodash');

module.exports = {
    loginUrl: 'http://www.charlottetheater.co.kr/etc/login.asp',
    // loginUrl: 'http://www.charlottetheater.co.kr',
    account: {
        id: process.env.CONF_ID,
        pwd: process.env.CONF_PWD,
    },
    // performanceUrl: 'http://www.charlottetheater.co.kr/performence/current.asp',
    performanceUrl: 'http://www.charlottetheater.co.kr/performence/next.asp',
    date: {
        ymd: '2018-11-16',
        hour: '20',
        min: '00',
    },
    seat: {
        rows: _.range(1, 18),
        cols: _.range(15, 29),
        regex: /([0-9]+)열 ([0-9]+)/g,
    },
    wantCnt: 2,
}
