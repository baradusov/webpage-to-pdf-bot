import { getUrls, generatePdf, getReadableContent } from '../_lib/index.js';

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
      return { error: true, message: 'Request cancelled.' };
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
    if (signal?.aborted) {
      return { error: true, message: 'Request cancelled.' };
    }
    console.error('handleUserMessage error:', message, error);

    return {
      pdf: false,
      message: error,
    };
  }
};
