import { extract } from '@extractus/article-extractor';
import { NetworkError, ParseError, CancelledError } from './errors.js';
import { getFromCache, setInCache } from './cache.js';

const removeLoadingAttributes = (html) => {
  if (!html) return html;
  return html.replace(/\s+loading=["'][^"']*["']/gi, '');
};

const parse = async (url, signal) => {
  const article = await extract(url, {}, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
      accept: 'text/html; charset=utf-8',
    },
    signal,
  });

  if (article && article.content) {
    article.content = removeLoadingAttributes(article.content);
  }

  return article;
};

export const getReadableContent = async (url, signal) => {
  if (signal?.aborted) {
    throw new CancelledError();
  }

  const cached = getFromCache(url);
  if (cached) {
    console.log('Cache hit:', url);
    if (cached.error) {
      throw cached.error;
    }
    return cached.content;
  }

  try {
    const readableContent = await parse(url, signal);

    if (!readableContent || !readableContent.content) {
      const error = new ParseError('No content extracted', url);
      setInCache(url, { error });
      throw error;
    }

    setInCache(url, { content: readableContent });
    return readableContent;
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      throw new CancelledError();
    }

    if (error.name === 'CancelledError') {
      throw error;
    }

    if (error.name === 'ParseError') {
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

    const parseError = new ParseError(error.message, url);
    setInCache(url, { error: parseError });
    throw parseError;
  }
};
