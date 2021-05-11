import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import { Readability } from '@mozilla/readability';

export const getReadableContent = async (url) => {
  try {
    const resourceLoader = new jsdom.ResourceLoader({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
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
