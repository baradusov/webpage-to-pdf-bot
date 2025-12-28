import { addQueryRules, extract, setRequestOptions } from 'article-parser';

const extraCleaning = (document) => {
  document.querySelectorAll('img').forEach((img) => {
    img.removeAttribute('loading');
  });

  return document;
};

const parse = async (url, signal) => {
  addQueryRules([
    {
      tranform: extraCleaning,
    },
  ]);
  setRequestOptions({
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
      accept: 'text/html; charset=utf-8',
    },
    signal,
  });

  const article = await extract(url);

  return article;
};

export const getReadableContent = async (url, signal) => {
  if (signal?.aborted) {
    return { error: true };
  }

  try {
    const readableContent = await parse(url, signal);

    return readableContent;
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      return { error: true };
    }
    console.error('getReadableContent error:', url, error);

    if (error.name === 'RequestError') {
      throw "Can't open the link 😞";
    }
  }
};
