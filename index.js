// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const csv = require("csvtojson");
const queryString = require("query-string");
const ObjectsToCsv = require("objects-to-csv");

const csvFilePath = "./input.csv";

puppeteer.use(StealthPlugin());

// puppeteer usage as normal
puppeteer.launch({ headless: false }).then(async (browser) => {
  const result = [];
  const array = await csv().fromFile(csvFilePath);

  const page = await browser.newPage();
  await page.goto("https://www.walmart.com/help");

  for (const element of array) {
    let url = "";
    let tracking_id = "";

    console.log("0%");
    await page.waitForSelector("button#contact-us");
    await page.click("button#contact-us");

    console.log("5%");
    await page.waitForSelector('[alt="An order"]');
    await page.click('[alt="An order"]');

    console.log("30%");
    await page.waitForTimeout(4000);
    await page.type('[aria-label="Type a message"]', element.email, {
      delay: 20,
    });
    await page.click(".wc-send");

    console.log("50%");
    await page.waitForTimeout(4000);
    await page.type('[aria-label="Type a message"]', element.fullOrderId, {
      delay: 20,
    });
    await page.click(".wc-send");

    await page.waitForTimeout(10000);

    console.log("80%");
    const status = await page.evaluate(() => {
      const temp = document.querySelector("div:nth-child(5) > p > strong");
      if (temp) {
        return temp.textContent;
      }

      return "";
    });

    await page.click('[title="Yes, this is the order"]');
    await page.waitForTimeout(5000);

    if (await page.$('[title="Track shipment"]')) {
      await page.click('[title="Track shipment"]');

      const getNewPageWhenLoaded = async () => {
        return new Promise((x) =>
          browser.on("targetcreated", async (target) => {
            if (target.type() === "page") {
              const newPage = await target.page();
              const newPagePromise = new Promise((y) =>
                newPage.once("domcontentloaded", () => y(newPage))
              );
              const isPageLoaded = await newPage.evaluate(
                () => document.readyState
              );
              return isPageLoaded.match("complete|interactive")
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
        url.replace("https://www.walmart.com/tracking", "")
      );
      tracking_id = parsed.tracking_id;
    }

    console.log("100%");

    const objectResult = {
      email: element.email,
      fullOrderId: element.fullOrderId,
      status: status,
      url,
      tracking_id,
    };
    console.log(objectResult);
    result.push(objectResult);

    const csv = new ObjectsToCsv(result);
    // Save to file:
    await csv.toDisk("./output.csv");
    await page.click(".wc-close-chat-button");
    await page.click(".confirm-close-button");
  }

  await browser.close();
});
