const logger = require('./logger');
const getUrls = require('./getUrls');
const generatePdf = require('./generatePdf');
const getReadableContent = require('./getReadableContent');

module.exports = async ({ message }) => {
  try {
    const urls = getUrls(message);

    if (!urls) {
      await logger(
        'botFailure',
        message.from.id,
        message.text,
        "It doesn't seem to be a link 🤔"
      );

      return {
        pdf: false,
        message: "It doesn't seem to be a link 🤔",
      };
    }

    const url = !urls[0].includes('://') ? `http://${urls[0]}` : urls[0];
    const html = await getReadableContent(url);

    if (!html) {
      await logger(
        'botFailure',
        message.from.id,
        url,
        "Can't get the content from the link 😞"
      );

      return {
        pdf: false,
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(html);

    await logger(
      'botSuccess',
      message.from.id,
      url,
      urls.length > 1 ? 'One link at a time, sorry' : null
    );

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
    };
  } catch (error) {
    await logger(
      'botFailure',
      message.from.id,
      message.text || 'no link',
      error.message
    );

    return {
      pdf: false,
      message: error,
    };
  }
};
