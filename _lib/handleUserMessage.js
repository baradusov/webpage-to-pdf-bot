import {
  getUrls,
  generatePdf,
  getReadableContent,
  getReadableFile,
  getFileHtml,
  isReadableDocument,
} from '../_lib/index.js';
import { CancelledError, getUserMessage } from './errors.js';
import { checkUrl } from './checkUrl.js';
import { BOT_REPLIES } from './config.js';

// A fallback is still a result, but it must say it was not cleaned up.
const captionFor = (readable) => (readable.degraded ? BOT_REPLIES.notCleaned : undefined);

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';

const checkContentType = async (url, signal) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: signal || controller.signal,
      headers: { 'user-agent': USER_AGENT },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    return {
      isHtml: contentType.includes('text/html') || contentType.includes('text/plain'),
      contentType,
    };
  } catch {
    return { isHtml: true, contentType: 'unknown' };
  }
};

export const handleUserMessage = async (ctx, signal) => {
  const { message } = ctx;

  try {
    const urls = getUrls(message);

    if (!urls) {
      if (isReadableDocument(message.document)) {
        const html = await getFileHtml(ctx.api, message.document, signal);
        const readable = await getReadableFile(html, message.document.file_name || 'page.html');
        const { pdf, name } = await generatePdf(readable, signal);

        return { pdf, name, message: null, caption: captionFor(readable) };
      }

      return {
        pdf: false,
        message: "I need a link 🤔\nYou can also send a saved .html file.",
        reason: 'not_a_link',
      };
    }

    const url = !urls[0].includes('://') ? `http://${urls[0]}` : urls[0];

    const allowed = await checkUrl(url);

    if (!allowed.ok) {
      console.log('Rejected url:', url, 'Reason:', allowed.reason);
      return { pdf: false, message: allowed.message, reason: allowed.reason };
    }

    const { isHtml, contentType } = await checkContentType(url, signal);

    if (!isHtml) {
      console.log('Rejected non-HTML url:', url, 'Content-Type:', contentType);
      return {
        pdf: false,
        message: "That's not a web page 🙅",
        reason: 'not_html',
      };
    }

    console.log('Started processing url:', url);
    const readableContent = await getReadableContent(url, signal);

    if (signal?.aborted) {
      throw new CancelledError();
    }

    if (!readableContent || readableContent.error) {
      return {
        pdf: false,
        message: "I can't get the text from this link 😞",
        reason: 'no_content',
      };
    }

    const { pdf, name } = await generatePdf(readableContent, signal);

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
      caption: captionFor(readableContent),
    };
  } catch (error) {
    if (signal?.aborted || error.name === 'CancelledError') {
      return { error: true, message: 'Cancelled.' };
    }

    console.error('handleUserMessage error:', error.name, error.message);

    return {
      pdf: false,
      message: getUserMessage(error),
      errorType: error.name,
      reason: error.name,
      isRetryable: error.isRetryable,
    };
  }
};
