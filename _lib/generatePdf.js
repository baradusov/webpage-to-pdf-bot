import { withPage } from './browser.js';
import { PAGE_STYLE } from './config.js';
import { BrowserError, CancelledError } from './errors.js';
// og:title is attacker-controlled: the extractor sanitises the body, not metadata.
import { escapeHtml } from './escapeHtml.js';

export const generatePdf = async ({ title, content, url }, signal) => {
  if (signal?.aborted) {
    throw new CancelledError();
  }

  try {
    return await withPage(async (page) => {
      // The browser outlives this request, so an abort may only take the page.
      const abortHandler = () => {
        page.close().catch(() => {});
      };

      signal?.addEventListener('abort', abortHandler);

      try {
        const date = new Date();
        const safeTitle = escapeHtml(title);
        const safeUrl = escapeHtml(url);
        // An uploaded file has a name here, not an address to link to.
        const source = /^https?:\/\//i.test(String(url ?? ''))
          ? `<a class="source" href="${safeUrl}">${safeUrl}</a>`
          : safeUrl;

        // Nothing here needs scripting, and 'load' waits on images, not on JS.
        await page.setJavaScriptEnabled(false);

        await page.setContent(
          `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${content}
  <footer>
    <p>PDF generated at: ${date}</p>
    <p>Source: ${source}</p>
  </footer>
</body>
</html>`,
          // 'load' waits for every image, and getReadableContent strips
          // loading= attributes so none are deferred. 'networkidle0' would then
          // sit through its idle timer for nothing — seconds per PDF.
          { waitUntil: 'load' }
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
      } finally {
        signal?.removeEventListener('abort', abortHandler);
      }
    });
  } catch (error) {
    if (signal?.aborted || error.name === 'CancelledError') {
      throw new CancelledError();
    }

    console.error('generatePdf error:', url, error.message);
    throw new BrowserError(error.message, url);
  }
};
