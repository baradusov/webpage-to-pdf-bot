import { getUrls, generatePdf, getReadableContent } from '../_lib/index.js';
import { CancelledError, getUserMessage } from './errors.js';

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
