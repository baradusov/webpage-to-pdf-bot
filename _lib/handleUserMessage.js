import { getUrls, generatePdf, getReadableContent } from '../_lib/index.js';

export const handleUserMessage = async ({ message }) => {
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
    const readableContent = await getReadableContent(url);

    if (!readableContent || readableContent.error) {
      return {
        pdf: false,
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(readableContent);

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
    };
  } catch (error) {
    console.error('handleUserMessage error:', message, error);

    return {
      pdf: false,
      message: error,
    };
  }
};
