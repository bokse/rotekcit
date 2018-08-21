_ = require('lodash');

module.exports = {
    loginUrl: 'http://www.charlottetheater.co.kr/etc/login.asp',
    account: {
        id: '',
        pwd: '',
    },
    performanceUrl: 'http://www.charlottetheater.co.kr/performence/current.asp',
    // performanceUrl: 'http://www.charlottetheater.co.kr/performence/next.asp',
    date: {
        ymd: '2018-09-15',
        hour: '18',
        min: '30',
    },
    seat: {
        rows: _.range(1, 18),
        cols: _.range(15, 29),
        regex: /([0-9]+)열 ([0-9]+)/g,
    },
    wantCnt: 2,
}