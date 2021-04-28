const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

module.exports = async (url) => {
  try {
    const doc = await JSDOM.fromURL(url);
    const reader = new Readability(doc.window.document);
    const readblePage = reader.parse();
    return readblePage;
  } catch (error) {
    console.error('getReadableContent', error);

    if (error.name === 'RequestError') {
      throw "Can't open the link 😞";
    }
  }
};
