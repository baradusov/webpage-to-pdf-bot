import { extractFromHtml } from '@extractus/article-extractor';
import { NetworkError, ParseError, CancelledError } from './errors.js';
import { getFromCache, setInCache } from './cache.js';
import { fetchHtml } from './fetchHtml.js';

const removeLoadingAttributes = (html) => {
  if (!html) return html;
  return html.replace(/\s+loading=["'][^"']*["']/gi, '');
};

const parse = async (url, signal) => {
  const html = await fetchHtml(url, signal);
  const article = await extractFromHtml(html, url);

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

    if (error.name === 'ParseError' || error.name === 'NetworkError') {
      throw error;
    }

    if (error.name === 'TooLargeError') {
      setInCache(url, { error });
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
