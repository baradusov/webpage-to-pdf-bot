const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const { FONTS, PAGE_STYLE } = require('./config');

module.exports = async ({ title, content }) => {
  await chrome.font(FONTS.telugu);
  await chrome.font(FONTS.arabic);
  await chrome.font(FONTS.hindi);

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  });
  const page = await browser.newPage();

  await page.setContent(`
  <!doctype html>
  <html lang=en>
  <head>
  <meta charset=utf-8>
  <title>${title}</title>
  </head>
  <body>
  <h1>${title}</h1>
  ${content}
  </body>
  </html>
  `);
  await page.addStyleTag({ content: PAGE_STYLE });

  const buffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px',
    },
  });

  await browser.close();

  return {
    name: title,
    pdf: buffer,
  };
};
