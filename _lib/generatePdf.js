import puppeteer from 'puppeteer';
import { PAGE_STYLE } from './config.js';

export const generatePdf = async ({ title, content, url }) => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--single-process', '--no-zygote'],
      handleSIGTERM: true,
      handleSIGINT: true,
    });
    const page = await browser.newPage();
    const date = new Date();

    await page.setContent(
      `
  <!doctype html>
  <html lang=en>
  <head>
  <meta charset=utf-8>
  <title>${title}</title>
  </head>
  <body>
  <h1>${title}</h1>
  ${content}
  <footer>
  <p>PDF's generated at: ${date}</p>
  <p>Source: <a class="source" href="${url}">${url}</a></p>
  </footer>
  </body>
  </html>
  `,
      { waitUntil: 'networkidle0' }
    );
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
    console.error('generatePdf error:', url, error);
    throw 'Something goes wrong and the bot is not working now 😞. Try again later.\n\n@baradusov already know this and will fix it soon.\nOr if you already tried and the bot still not working, message him, please.';
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
