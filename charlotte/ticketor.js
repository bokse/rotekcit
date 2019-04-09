const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const _ = require('lodash');
const debug = require('debug')('ticketor');
const timer = require('debug')('timer');
const exec = require('child_process').exec

const launchOption = {
    headless: false,
    slowMo: 0,
    args: [
        `--window-size=1280,720`,
    ],
}

const jobConfig = require('./conf');

function pivots() {
    const candidates = []
    for (const r of jobConfig.seat.rows) {
        for (const c of jobConfig.seat.cols) {
            candidates.push({
                r: r,
                c: c,
            })
        }
    }
    const middle = (_.first(jobConfig.seat.cols) + _.last(jobConfig.seat.cols)) / 2 + 1; 

    return _.sortBy(candidates, seat => {
        return Math.abs(seat.r - 2) + 2 * Math.abs(seat.c - middle);
    })
}


function id(row, col) {
    return `row=${parseInt(row)}@@@col=${parseInt(col)}`;
}

async function waitFor(asyncFunc, config = { maxCount: 10, delay: 50 }, ...args) {
    while(config.maxCount > 0) {
        const r = await asyncFunc(...args).catch(e => {});
        if(!_.isUndefined(r)) {
            return r;
        }
        config.maxCount -= 1;
        await Promise.delay(config.delay);
    }
}

async function main() {
    const browser = await puppeteer.launch(launchOption);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, });

    // 로그인 시작
    debug(`로그인 시작: 계정 ${jobConfig.account.id}`);
    await page.goto(jobConfig.loginUrl);
    // await page.waitForSelector('#user_id');
    // await page.waitForSelector('#user_password');
    // await page.waitForSelector('#frmMain > input.btn_login_submmit');
    // await page.type('#user_id', jobConfig.account.id);
    // await page.type('#user_password', jobConfig.account.pwd);
    // await page.click('#frmMain > input.btn_login_submmit');
    // await Promise.delay(1000);
    // debug('로그인 성공');

    //@TODO: 풀리는 시간까지 기다리기

   
    await Promise.delay(20000);
    timer('-------------------예약 시작-------------------');

    await waitFor(async() => {
        debug('공연페이지로 이동');
        await page.goto(jobConfig.performanceUrl);

        return await page.waitForSelector('#reserv_pop', { timeout: 100 })
    }, {
        maxCount: 100000,
        delay: 0,
    })

    page.on('dialog', dialog => {
        const msg = dialog.message();
        debug(msg);
        dialog.accept();
    });
    
    const revPage = await new Promise((resolve, reject) => {
        browser.once('targetcreated', target => {
            const p = target.page()
            p.then(p => {
                p.once('dialog', dialog => {
                    debug(dialog.message());
                    dialog.accept();
                });
            })
            resolve(p)
        });

        page.waitForSelector('#reserv_pop')
            .then(e => {
                return page.evaluate(e => e.click(), e)
            })

        setTimeout(() => reject('No reservation page'), 100000)
    });

    debug('예약 페이지 찾았다.')

    await Promise.delay(1000);
    await revPage.evaluate(ymd => {
        step.RunEvt('selectPlaydate', this, ymd)
    }, jobConfig.date.ymd)
        .then(() => Promise.delay(100));

    await revPage.$$eval('a[id^=jsSequenceSelector]', (elements, hourMin) => {
        for (const ele of elements) {
            if (ele.innerText == hourMin) {
                ele.click();
                return ele;
            }
        }
    }, `${jobConfig.date.hour}시 ${jobConfig.date.min}분`)
        .then(() => Promise.delay(100));

    await revPage.evaluate(() => {
        step.RunEvt('goNext')
    });

    const pivot_seats = pivots()
    debug(pivot_seats)

    await waitFor(async() => {
        debug('좌석 선택 창 진입')

        await revPage.waitForSelector('img[title^="[VIP석] 1층 B구역"][data-status="2"]')
        const seats = await revPage.$$('img[title^="[VIP석] 1층 B구역"][data-status="2"]')
    
        const z = new Map();
    
        await Promise.map(seats, async(seat) => {
            const vHandle = await seat.getProperty('title');
            const title = await vHandle.jsonValue();
            const match = jobConfig.seat.regex.exec(title);
            jobConfig.seat.regex.lastIndex = 0;
            if(match) {
                z.set(id(match[1], match[2]), seat);
            }
            else {
                debug(`정규표현식 안맞음 title = ${title}`)
            }
        });

        let revCnt = 0;
        const revInfos = [];

        for (const p of pivot_seats) {
            if (revCnt == jobConfig.wantCnt) break;

            if(z.has(id(p.r, p.c)) && z.has(id(p.r, p.c + 1))) {
                z.get(id(p.r, p.c)).click()
                z.get(id(p.r, p.c+1)).click()
                debug(`1층 B구역 ${p.r}열 ${p.c} 좌석을 예약합니다`);
                debug(`1층 B구역 ${p.r}열 ${p.c + 1} 좌석을 예약합니다`);
                revInfos.push({
                    row: p.r,
                    col: p.c,
                });
                revInfos.push({
                    row: p.r,
                    col: p.c + 1,
                });
                revCnt += 2;
                await Promise.delay(200);
            }
        }

        if(revCnt < jobConfig.wantCnt) {
            exec('say 예약실패. 페이지 리로드');
            await revPage.reload();
            return Promise.reject('예약 실패');
        }

        await Promise.delay(50);
        await revPage.evaluate(() => {
            step.RunEvt('checkFixedseat')
        });
    
        //@TODO: '이미 선택된 좌석입니다' 해결--
    
        timer('-------------------예약 끄읏-------------------');
        let infoStr = '';
        revInfos.forEach((revInfo, idx) => {
            infoStr = infoStr.concat(`${revInfo.row}열 ${revInfo.col}번째 자리, `);
        })
        exec(`say 예약에 성공하였습니다. 나머지 정보를 얼른 입력해주시기 바랍니다. 자리는 ${infoStr} 입니다`)
        return Promise.resolve(revInfos);
    }, {
        maxCount: 10000000,
        delay: 300,
    })
}

main();
