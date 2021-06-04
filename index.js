const puppeteer = require('puppeteer');
const csv = require('csvtojson');

const csvFilePath = './input.csv';

const chromeOptions = {
  headless: false,
  defaultViewport: null,
};

(async () => {
  const result = [];
  const array = await csv().fromFile(csvFilePath);

  const browser = await puppeteer.launch(chromeOptions);
  const page = await browser.newPage();
  await page.goto('https://www.walmart.com/help');

  for (const element of array) {
    await page.waitForTimeout(5000);
    await page.click('button#contact-us');
    await page.waitForTimeout(10000);
    await page.click('[aria-label="An order"]');
    await page.waitForTimeout(10000);
    await page.type('[aria-label="Type a message"]', element.email, {
      delay: 20,
    });
    await page.click('.wc-send');
    await page.waitForTimeout(5000);
    await page.type('[aria-label="Type a message"]', element.fullOrderId, {
      delay: 20,
    });
    await page.click('.wc-send');
    await page.waitForTimeout(10000);
    const status = await page.$eval(
      'div:nth-child(8) > p',
      (el) => el.textContent
    );

    const objectResult = {
      email: element.email,
      fullOrderId: element.fullOrderId,
      status: status,
    };
    console.log(objectResult);
    result.push(objectResult);

    await page.click('.wc-close-chat-button');
    await page.click('.confirm-close-button');
  }

  await browser.close();
})();
