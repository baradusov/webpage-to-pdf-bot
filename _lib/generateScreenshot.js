import puppeteer from 'puppeteer';

export const generateScreenshot = async (url, signal) => {
  if (signal?.aborted) {
    throw 'Request cancelled.';
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
      throw 'Request cancelled.';
    }

    const page = await browser.newPage();

    await page.emulateMediaType('screen');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: '15000' });

    if (signal?.aborted) {
      throw 'Request cancelled.';
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
    if (signal?.aborted) {
      throw 'Request cancelled.';
    }
    console.error('generateScreenshot error:', url, error);
    throw 'Something goes wrong and the bot is not working now 😞. Try again later.\n\n@baradusov already know this and will fix it soon.\nOr if you already tried and the bot still not working, message him, please.';
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    if (browser !== null) {
      await browser.close();
    }
  }
};
