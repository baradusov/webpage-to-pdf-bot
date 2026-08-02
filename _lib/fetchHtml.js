import { NetworkError, TooLargeError } from './errors.js';

// A 44 MB page of admissions lists once turned into roughly a gigabyte of DOM,
// and the process was killed before it could confirm the update — so Telegram
// kept redelivering it and the bot restarted every 30 seconds for two hours.
export const MAX_BYTES = Number(process.env.MAX_PAGE_BYTES) || 5_000_000;

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';

/**
 * Downloads a page, refusing anything past MAX_BYTES.
 *
 * The declared length is only a hint — it can be absent or wrong — so the body
 * is counted as it arrives and the transfer is dropped the moment it goes over.
 */
export const fetchHtml = async (url, signal) => {
  let response;

  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html; charset=utf-8' },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new NetworkError(error.message, url);
  }

  if (!response.ok) {
    throw new NetworkError(`Request failed with error code ${response.status}`, url);
  }

  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_BYTES) {
    response.body?.cancel();
    throw new TooLargeError(`Declared ${declared} bytes`, url);
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of response.body) {
    size += chunk.length;

    // Leaving the loop cancels the stream; calling cancel() here would throw,
    // since the iterator holds the lock.
    if (size > MAX_BYTES) {
      throw new TooLargeError(`Exceeded ${MAX_BYTES} bytes while reading`, url);
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
};
