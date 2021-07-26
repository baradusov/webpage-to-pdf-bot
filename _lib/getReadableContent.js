import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch';

const extraCleaning = (el) => {
  const { window } = new JSDOM(el.innerHTML);
  window.document.querySelectorAll('img').forEach((img) => {
    img.removeAttribute('loading');
  });

  return window.document.body.innerHTML;
};

const validateContent = (contentType) => {
  return contentType.includes('text/html');
};

export const getReadableContent = async (url) => {
  try {
    let isValidContent;
    const { headers } = await fetch(url);

    if (headers.has('Content-Type')) {
      const contentType = headers.get('Content-Type');
      isValidContent = validateContent(contentType);
    }

    if (isValidContent) {
      const resourceLoader = new jsdom.ResourceLoader({
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
        strictSSL: false,
      });
      const doc = await JSDOM.fromURL(url, { resources: resourceLoader });
      const reader = new Readability(doc.window.document, {
        serializer: (el) => {
          const cleanedReadablePage = extraCleaning(el);
          return cleanedReadablePage;
        },
      });
      const readblePage = reader.parse();
      return readblePage;
    }

    return null;
  } catch (error) {
    console.error('getReadableContent error:', url, error);

    if (error.name === 'RequestError') {
      throw "Can't open the link 😞";
    }
  }
};
