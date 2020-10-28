const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const { FONTS, PAGE_STYLE } = require('./config');

module.exports = async ({ title, content }) => {
  let browser = null;

  try {
    await chrome.font(FONTS.telugu);
    await chrome.font(FONTS.arabic);
    await chrome.font(FONTS.hindi);

    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: puppeteer.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
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
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    return {
      name: title,
      pdf: buffer,
    };
  } catch (error) {
    throw 'Something goes wrong and the bot is not working now 😞. Try again later.\n\n@baradusov already know this and will fix it soon.\nOr if you already tried and the bot still not working, message him, please.';
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
