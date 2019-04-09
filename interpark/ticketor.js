
// 선예매버튼
// body > div.wrap_DT_body > div.dt_Top_Wrap > div.dt_Tmid > div > div.DT_infoWrap > div > div.DT_Rarea > div.tk_dt_btn_TArea > a

// 기존버튼
// body > div.wrap_DT_body > div.dt_Top_Wrap > div.dt_Tmid > div > div.DT_infoWrap > div > div.DT_Rarea > div.tk_dt_btn_TArea > a

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
        `--window-size=1280,880`,
    ],
}

const monthSelector = '.cal_move > div > h3';

function sortedColumns(middle) {
    return _.sortBy(_.range(1, 2*middle), col => {
        return Math.abs(col - middle);
    })
}

const jobConfig = require('./conf');

function id(row, col) {
    return `row=${row}@@@col=${col}`;
}

async function blockImages(page) {
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.resourceType() === 'image')
        request.abort();
      else
        request.continue();
    });
}

async function resize(browser, page) {
    let height = 800;
    let width = 1280;
    await page.setViewport({height, width});
    // Window frame - probably OS and WM dependent.
    height += 85;

    // Any tab.
    const {targetInfos: [{targetId}]} = await browser._connection.send(
        'Target.getTargets'
    );
    
    // Tab window. 
    const {windowId} = await browser._connection.send(
        'Browser.getWindowForTarget',
        {targetId}
    );
    
    // Resize.
    await browser._connection.send('Browser.setWindowBounds', {
        bounds: {height, width},
        windowId
    });
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
    await page.waitForSelector('#UID');
    await page.waitForSelector('#PWD');
    await page.waitForSelector('.btnRed');
    await page.type('#UID', jobConfig.account.id);
    await page.type('#PWD', jobConfig.account.pwd);
    await page.click('.btnRed');
    await Promise.delay(1000);
    debug('로그인 성공');

    //@TODO: 풀리는 시간까지 기다리기

    // process.stdin._read(1);
   
    timer('-------------------예약 시작-------------------');

    await waitFor(async() => {
        debug('공연페이지로 이동');
        await page.goto(jobConfig.performanceUrl);

        const calendarFrame = await waitFor(async() => {
            debug('달력찾자');
            return Promise.resolve(_.find(page.frames(), frame => {
                return frame.name() == 'ifrCalendar';
            }));
        });


        await calendarFrame.waitForSelector(monthSelector);
        const yearMonth = await calendarFrame.$eval(monthSelector, ele => {
            return ele.innerText
        });
        debug(`현재 달: ${yearMonth}`)
        const match = /([0-9]+)\.([0-9]+)/g.exec(yearMonth);
        const year = match[1];
        const month = match[2];
        const delta = 12 * (jobConfig.date.year - year) + (jobConfig.date.month - month);
        debug(`delta: ${delta}`);

        if (delta > 0) {
            for (let i = delta; i > 0; --i) {
                debug('다음 달로 이동');
                await waitFor(async() => {
                    await calendarFrame.waitForSelector('.next');
                    await calendarFrame.click('.next');
                    return true;
                });
                await Promise.delay(150);
            }
        }
        else if (delta < 0) {
            for (let i = delta; i > 0; --i) {
                // debug('이전 달로 이동');
                await waitFor(async() => {
                    await calendarFrame.waitForSelector('.pre');
                    await calendarFrame.click('.pre');
                    return true;
                });
            }
            await Promise.delay(250);
        }
        
        const dayClick = calendarFrame.$$eval('td[id^=CellPlayDate] > a', (elements, day) => {
            if(elements.length == 0) {
                return Promise.reject('no elements');
            }
            for (const ele of elements) {
                if (parseInt(ele.innerText) == day) {
                    ele.click();
                    return ele;
                }
            }
            return elements.length;
        }, parseInt(jobConfig.date.day));
        
        return await dayClick.then(r => {
            debug('날짜 찾았다');
            return true;
        }).catch(e => {});
    }, {
        maxCount: 10000,
        delay: 0,
    })
    const revButton = await page.$('body > div.wrap_DT_body > div.dt_Top_Wrap > div.dt_Tmid > div > div.DT_infoWrap > div > div.DT_Rarea > div.tk_dt_btn_TArea > a');    
    await revButton.click();

    await page.evaluate(() => {
        fnNormalBooking();
    });

    const revPage = await waitFor(async() => {
        debug('예약페이지 찾자');
        return _.find(await browser.pages(), page => {
            // 뒤에 주소는 deprecated
            return page.url() == 'https://poticket.interpark.com/Book/BookMain.asp' || page.url() == 'https://ticket.interpark.com/Book/BookMain.asp';
        });
    });
    await revPage.setViewport({ width: 1280, height: 720, });

    await waitFor(async() => {
        await waitFor(async() => {
            return await revPage.$eval('.closeBtn', ele => {
                console.log('닫기 버튼 클릭');
                eval(ele.href);
                return true;
            }).catch(e => {
                debug('닫기 버튼 없음');
                return true;
            });
        });
    
        // const bookStepFrame = await waitFor(async() => {
        //     debug('예약페이지에서 달력찾자');
        //     return _.find(revPage.frames(), frame => {
        //         return frame.name() == 'ifrmBookStep';
        //     });
        // });
        // await bookStepFrame.waitForSelector('#CellPlaySeq');
        // await bookStepFrame.$$eval('#CellPlaySeq', (elements, timeText) => {
        //     for (const ele of elements) {
        //         if (ele.innerText.includes(timeText)) {
        //             ele.click();
        //             return;
        //         }
        //     }
        // }, `${jobConfig.date.hour}시 ${jobConfig.date.min}분`);
    
        await revPage.$eval('#LargeNextBtnLink', ele => {
            eval(ele.href);
        })

        const seatDetailFrame = await waitFor(async() => {
            debug('좌석 찾자');
            return _.find(revPage.frames(), frame => {
                return frame.name() == 'ifrmSeatDetail';
            });
        });

        await seatDetailFrame.evaluate(region => {
            GetBlockSeatList('', '', region)
        }, process.env.CONF_REGION)

        let revCnt = 0;
        const revInfos = [];
    
        for (const level of jobConfig.seat.levels) {
            if (revCnt == jobConfig.wantCnt) break;
    
            // const isAnySeat = await seatDetailFrame.waitForSelector(`img[title^="[${level}석]"].stySeat`, {
            //     timeout: 500,
            // }).then(r => true).catch(e => {
            //     debug(`${level}석이 없습니다`);
            // });
            
            // if (!isAnySeat) {
            //     continue;
            // }
    
            // const seats = await seatDetailFrame.$$(`img[title^="[${level}석]"].stySeat`);
            const seats = await seatDetailFrame.$$(`img.stySeat`);
            debug(`${level}석 ${seats.length}개`)

            if (seats.length == 0) {
                continue;
            }
    
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

            for (const row of jobConfig.seat.rows) {
                if (revCnt == jobConfig.wantCnt) break;
                for(const col of jobConfig.seat.cols) {
                    if (revCnt == jobConfig.wantCnt) break;
                    if(z.has(id(row, col))) {
                        z.get(id(row, col)).click();
                        debug(`${level}석 ${row}열 ${col} 좌석을 예약합니다`);
                        revInfos.push({
                            level: level,
                            row: row,
                            col: col,
                        });
                        revCnt += 1;
                    }
                }
            }
        }
        // debug(`목표 ${jobConfig.wantCnt}개 중 ${revCnt}개 성공`);

        if(revCnt < jobConfig.wantCnt) {
            // exec('say 예약실패. 페이지 리로드');
            await revPage.reload();
            await resize(browser, revPage);
            return Promise.reject('예약 실패');
        }
    
        const seatFrame = _.find(revPage.frames(), frame => {
            return frame.name() == 'ifrmSeat';
        });

        await seatFrame.waitForSelector('.btnWrap > a');
        await seatFrame.click('.btnWrap > a');
        //@TODO: '이미 선택된 좌석입니다' 해결--
    
        timer('-------------------예약 끄읏-------------------');
        let infoStr = '';
        revInfos.forEach((revInfo, idx) => {
            infoStr = infoStr.concat(`${revInfo.level}석 ${revInfo.row}열 ${revInfo.col}번째 자리, `);
        })
        exec(`say 예약에 성공하였습니다. 나머지 정보를 얼른 입력해주시기 바랍니다. 자리는 ${infoStr} 입니다`)
        return Promise.resolve(revInfos);
    }, {
        maxCount: 10000000,
        delay: 700,
    })
}

main();
