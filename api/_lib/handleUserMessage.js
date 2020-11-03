const getUrls = require('./getUrls');
const generatePdf = require('./generatePdf');
const getReadableContent = require('./getReadableContent');

module.exports = async ({ message }) => {
  try {
    const urls = getUrls(message);

    if (!urls) {
      return {
        pdf: false,
        message: "It doesn't seem to be a link 🤔",
      };
    }

    const url = !urls[0].includes('://') ? `http://${urls[0]}` : urls[0];
    const html = await getReadableContent(url);

    if (!html) {
      return {
        pdf: false,
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(html, url);

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
    };
  } catch (error) {
    console.error('ERROR', error);

    return {
      pdf: false,
      message: error,
    };
  }
};
