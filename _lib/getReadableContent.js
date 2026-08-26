import { extractFromHtml } from '@extractus/article-extractor';
import sanitize from 'sanitize-html';
import { SANITIZE_OPTIONS } from './sanitizeOptions.js';
import {
  NetworkError,
  ParseError,
  ScriptedPageError,
  CancelledError,
} from './errors.js';
import { getFromCache, setInCache } from './cache.js';
import { fetchHtml } from './fetchHtml.js';

// Text a reader would see: what is left once scripts and markup are gone.
const visibleText = (html) =>
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Below this a page carries no article at all, only the shell a script fills in.
const MIN_TEXT = 500;

const stripped = (html) => {
  const body = String(html ?? '').replace(/<head[\s\S]*?<\/head>/i, '');

  return sanitize(body, SANITIZE_OPTIONS).trim();
};

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

  return { html, article };
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
    const { html, article } = await parse(url, signal);

    if (!article || !article.content) {
      if (visibleText(html).length < MIN_TEXT) {
        const error = new ScriptedPageError('Page has no text without scripts', url);
        setInCache(url, { error });
        throw error;
      }

      const content = stripped(html);

      if (!content) {
        const error = new ParseError('No content extracted', url);
        setInCache(url, { error });
        throw error;
      }

      const degraded = {
        title: titleOf(html, hostOf(url)),
        content,
        url,
        degraded: true,
      };
      setInCache(url, { content: degraded });

      return degraded;
    }

    setInCache(url, { content: article });
    return article;
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      throw new CancelledError();
    }

    if (error.name === 'CancelledError') {
      throw error;
    }

    if (
      error.name === 'ParseError' ||
      error.name === 'NetworkError' ||
      error.name === 'ScriptedPageError'
    ) {
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

// The extractor needs a base url and never resolves one for an uploaded file.
const FILE_BASE = 'https://file.invalid/';

export const titleOf = (html, fallback) => {
  const found = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();

  return found || fallback;
};

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'page';
  }
};

// A saved page is not always an article — a chat export has no prose to find.
// Falling back to the whole body keeps it usable, sanitised the same way.
export const getReadableFile = async (html, fileName) => {
  const name = titleOf(html, fileName.replace(/\.[^.]+$/, ''));
  const article = await extractFromHtml(html, FILE_BASE).catch(() => null);

  if (article?.content) {
    return { title: article.title || name, content: article.content, url: fileName };
  }

  const content = stripped(html);

  if (!content) {
    throw new ParseError('No content in the file', fileName);
  }

  return { title: name, content, url: fileName, degraded: true };
};
