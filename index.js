const puppeteer = require('puppeteer');
const csv = require('csvtojson');
const queryString = require('query-string');
const ObjectsToCsv = require('objects-to-csv');

const csvFilePath = './input.csv';

const chromeOptions = {
  headless: false,
  defaultViewport: null,
};

(async () => {
  const result = [];
  let url = '';
  let tracking_id = '';

  const array = await csv().fromFile(csvFilePath);

  const browser = await puppeteer.launch(chromeOptions);
  const page = await browser.newPage();
  await page.goto('https://www.walmart.com/help');

  for (const element of array) {
    console.log('0%');
    await page.waitForSelector('button#contact-us');
    await page.click('button#contact-us');

    console.log('5%');
    await page.waitForSelector('[aria-label="An order"]');
    await page.click('[aria-label="An order"]');

    console.log('30%');
    await page.waitForTimeout(4000);
    await page.type('[aria-label="Type a message"]', element.email, {
      delay: 20,
    });
    await page.click('.wc-send');

    console.log('50%');
    await page.waitForTimeout(4000);
    await page.type('[aria-label="Type a message"]', element.fullOrderId, {
      delay: 20,
    });
    await page.click('.wc-send');

    await page.waitForTimeout(10000);

    console.log('80%');
    const status = await page.evaluate(() => {
      const temp = document.querySelector('div:nth-child(8) > p');
      if (temp) {
        return temp.textContent;
      }

      return '';
    });

    const date = await page.evaluate(() => {
      const temp = document.querySelector('div:nth-child(11) > p');
      if (temp) {
        return temp.textContent;
      }

      return '';
    });

    if (await page.$('[aria-label="View Carrier Tracking"]')) {
      await page.click('[aria-label="View Carrier Tracking"]');

      const getNewPageWhenLoaded = async () => {
        return new Promise((x) =>
          browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
              const newPage = await target.page();
              const newPagePromise = new Promise((y) =>
                newPage.once('domcontentloaded', () => y(newPage))
              );
              const isPageLoaded = await newPage.evaluate(
                () => document.readyState
              );
              return isPageLoaded.match('complete|interactive')
                ? x(newPage)
                : x(newPagePromise);
            }
          })
        );
      };

      const newPagePromise = getNewPageWhenLoaded();
      const newPage = await newPagePromise;

      url = newPage.url();
      await newPage.close();

      const parsed = queryString.parse(
        url.replace('https://www.walmart.com/tracking', '')
      );
      tracking_id = parsed.tracking_id;
    }

    console.log('100%');

    const objectResult = {
      email: element.email,
      fullOrderId: element.fullOrderId,
      status: status,
      url,
      date,
      tracking_id,
    };
    console.log(objectResult);
    result.push(objectResult);

    const csv = new ObjectsToCsv(result);
    // Save to file:
    await csv.toDisk('./output.csv');
    await page.click('.wc-close-chat-button');
    await page.click('.confirm-close-button');
  }

  await browser.close();
})();
