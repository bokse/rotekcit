const _ = require('lodash')

module.exports = {
    loginUrl: 'https://ticket.interpark.com/Gate/TPLogin.asp?CPage=B&MN=Y&tid1=main_gnb&tid2=right_top&tid3=login&tid4=login',
    account: {
        id: process.env.CONF_ID,
        pwd: process.env.CONF_PWD,
    },
    performanceUrl: 'http://ticket.interpark.com/Ticket/Goods/GoodsInfo.asp?GoodsCode=19005515',
    // performanceUrl: 'http://ticket.interpark.com/Ticket/Goods/GoodsInfo.asp?GoodsCode=18007650',
    date: {
        year: '2019',
         //month: '5',
         //day: '17',
         //hour: '20',
         //min: '00',
        month: '4',
        day: '13',
        hour: '17',
        min: '00',
    },
    seat: {
        levels: ["R",],
        //levels: ["VIP", ],
        rows: _.range(1, 20),
        // rows: [process.argv[2]],
        cols: _.range(1, 26),
        // cols: ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '17', '18', '19', '20', '12', '13', '14', '15', '16'],
        regex: /([0-9]+)[^0-9]+([0-9]+)/g,
    },
    wantCnt: 2,
}
