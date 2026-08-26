import { fetchHtml, MAX_BYTES } from './fetchHtml.js';
import { TooLargeError } from './errors.js';

const READABLE_MIME = ['text/html', 'application/xhtml+xml', 'text/plain'];
const READABLE_EXT = /\.(html?|txt)$/i;

export const isReadableDocument = (document) => {
  if (!document) return false;

  return (
    READABLE_MIME.includes(document.mime_type) ||
    READABLE_EXT.test(document.file_name || '')
  );
};

export const getFileHtml = async (api, document, signal) => {
  const label = document.file_name || 'the file';

  if (document.file_size > MAX_BYTES) {
    throw new TooLargeError(`Declared ${document.file_size} bytes`, label);
  }

  const file = await api.getFile(document.file_id);
  const url = `https://api.telegram.org/file/bot${api.token}/${file.file_path}`;

  return fetchHtml(url, signal, label);
};
