import puppeteer from 'puppeteer';
import { BrowserError, NetworkError, CancelledError } from './errors.js';

export const generateScreenshot = async (url, signal) => {
  if (signal?.aborted) {
    throw new CancelledError();
  }

  let browser = null;

  const abortHandler = () => {
    if (browser) {
      browser.close().catch(() => {});
    }
  };

  signal?.addEventListener('abort', abortHandler);

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--single-process', '--no-zygote'],
      handleSIGTERM: true,
      handleSIGINT: true,
      defaultViewport: {
        width: 1920,
        height: 1200,
      },
    });

    if (signal?.aborted) {
      throw new CancelledError();
    }

    const page = await browser.newPage();

    await page.emulateMediaType('screen');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    if (signal?.aborted) {
      throw new CancelledError();
    }

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
    });
    const title = await page.title();

    return {
      name: title,
      screenshot: buffer,
    };
  } catch (error) {
    if (signal?.aborted || error.name === 'CancelledError') {
      throw new CancelledError();
    }

    console.error('generateScreenshot error:', url, error.message);

    if (
      error.name === 'TimeoutError' ||
      error.message?.includes('net::ERR_NAME_NOT_RESOLVED') ||
      error.message?.includes('net::ERR_CONNECTION_REFUSED') ||
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED')
    ) {
      throw new NetworkError(error.message, url);
    }

    throw new BrowserError(error.message, url);
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    if (browser !== null) {
      await browser.close();
    }
  }
};
