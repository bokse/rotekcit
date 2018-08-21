module.exports = {
    loginUrl: 'https://ticket.interpark.com/Gate/TPLogin.asp?CPage=B&MN=Y&tid1=main_gnb&tid2=right_top&tid3=login&tid4=login',
    account: {
        id: '',
        pwd: '',
    },
    performanceUrl: 'http://ticket.interpark.com/Ticket/Goods/GoodsInfo.asp?GoodsCode=18005352',
    //performanceUrl: 'http://ticket.interpark.com/Ticket/Goods/GoodsInfo.asp?GoodsCode=18002766',
    date: {
        year: '2018',
         //month: '5',
         //day: '17',
         //hour: '20',
         //min: '00',
        month: '8',
        day: '3',
        hour: '20',
        min: '00',
    },
    seat: {
        levels: ["VIP",],
        //levels: ["VIP", ],
        rows: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
        // rows: [process.argv[2]],
        cols: ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '17', '18', '19', '20', '12', '13', '14', '15', '16'],
        regex: /객석1층-([0-9]+)열-([0-9]+)/g,
    },
    wantCnt: 2,
}