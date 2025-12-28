import puppeteer from 'puppeteer';
import { PAGE_STYLE } from './config.js';
import { BrowserError, CancelledError } from './errors.js';

export const generatePdf = async ({ title, content, url }, signal) => {
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
    });

    if (signal?.aborted) {
      throw new CancelledError();
    }

    const page = await browser.newPage();
    const date = new Date();

    await page.setContent(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
  <footer>
    <p>PDF generated at: ${date}</p>
    <p>Source: <a class="source" href="${url}">${url}</a></p>
  </footer>
</body>
</html>`,
      { waitUntil: 'networkidle0' }
    );

    if (signal?.aborted) {
      throw new CancelledError();
    }

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
    if (signal?.aborted || error.name === 'CancelledError') {
      throw new CancelledError();
    }

    console.error('generatePdf error:', url, error.message);
    throw new BrowserError(error.message, url);
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    if (browser !== null) {
      await browser.close();
    }
  }
};
