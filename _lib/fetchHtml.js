import { NetworkError, TooLargeError } from './errors.js';

export const MAX_BYTES = Number(process.env.MAX_PAGE_BYTES) || 2_000_000;

// An uploaded page is read whole into memory, so this stays well under the
// 400 MB pm2 gives the bot. Telegram would hand over up to 20 MB.
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5_000_000;

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';

// label keeps the bot token out of errors when fetching a Telegram file.
export const fetchHtml = async (url, signal, label = url, limit = MAX_BYTES) => {
  let response;

  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html; charset=utf-8' },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new NetworkError(error.message, label);
  }

  if (!response.ok) {
    throw new NetworkError(
      `Request failed with error code ${response.status}`,
      label,
      response.status
    );
  }

  const declared = Number(response.headers.get('content-length'));
  if (declared > limit) {
    response.body?.cancel();
    throw new TooLargeError(`Declared ${declared} bytes`, label);
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of response.body) {
    size += chunk.length;

    if (size > limit) {
      throw new TooLargeError(`Exceeded ${limit} bytes while reading`, label);
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
};
