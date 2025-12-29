import { getUrls, generatePdf, getReadableContent } from '../_lib/index.js';
import { CancelledError, getUserMessage } from './errors.js';

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

export const handleUserMessage = async ({ message }, signal) => {
  try {
    const urls = getUrls(message);

    if (!urls) {
      return {
        pdf: false,
        message: "It doesn't seem to be a link 🤔",
      };
    }

    const url = !urls[0].includes('://') ? `http://${urls[0]}` : urls[0];

    const { isHtml, contentType } = await checkContentType(url, signal);

    if (!isHtml) {
      console.log('Rejected non-HTML url:', url, 'Content-Type:', contentType);
      return {
        pdf: false,
        message: "I can only process web pages, not media files 🙅",
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
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(readableContent, signal);

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
    };
  } catch (error) {
    if (signal?.aborted || error.name === 'CancelledError') {
      return { error: true, message: 'Request cancelled.' };
    }

    console.error('handleUserMessage error:', error.name, error.message);

    return {
      pdf: false,
      message: getUserMessage(error),
      errorType: error.name,
      isRetryable: error.isRetryable,
    };
  }
};
