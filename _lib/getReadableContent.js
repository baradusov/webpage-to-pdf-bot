import { addQueryRules, extract, setRequestOptions } from 'article-parser';
import { NetworkError, ParseError, CancelledError } from './errors.js';

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
    throw new CancelledError();
  }

  try {
    const readableContent = await parse(url, signal);

    if (!readableContent || !readableContent.content) {
      throw new ParseError('No content extracted', url);
    }

    return readableContent;
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      throw new CancelledError();
    }

    if (error.name === 'CancelledError' || error.name === 'ParseError') {
      throw error;
    }

    console.error('getReadableContent error:', url, error.message);

    if (
      error.name === 'RequestError' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      throw new NetworkError(error.message, url);
    }

    throw new ParseError(error.message, url);
  }
};
