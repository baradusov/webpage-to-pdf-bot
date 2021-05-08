const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { Readability } = require('@mozilla/readability');

module.exports = async (url) => {
  try {
    const resourceLoader = new jsdom.ResourceLoader({
      strictSSL: false,
    });
    const doc = await JSDOM.fromURL(url, { resources: resourceLoader });
    const reader = new Readability(doc.window.document);
    const readblePage = reader.parse();
    return readblePage;
  } catch (error) {
    console.error('getReadableContent error:', url, error);

    if (error.name === 'RequestError') {
      throw "Can't open the link 😞";
    }
  }
};
