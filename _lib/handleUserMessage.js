import { getUrls, generatePdf, getReadableContent } from '../_lib/index.js';
import { CancelledError, getUserMessage } from './errors.js';

const NON_HTML_EXTENSIONS = [
  '.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v',
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma', '.m4a',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.exe', '.dmg', '.apk', '.iso',
];

const isNonHtmlUrl = (url) => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return NON_HTML_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
};

export const handleUserMessage = async ({ message }, signal) => {
  try {
    const urls = getUrls(message);

    if (!urls) {
      return {
        pdf: false,
        message: "It doesn't seem to be a link 🤔",
      };
    }

    const url = !urls[0].includes('://') ? `http://${urls[0]}` : urls[0];

    if (isNonHtmlUrl(url)) {
      console.log('Rejected non-HTML url:', url);
      return {
        pdf: false,
        message: "I can only process web pages, not media files 🙅",
      };
    }

    console.log('Started processing url:', url);
    const readableContent = await getReadableContent(url, signal);

    if (signal?.aborted) {
      throw new CancelledError();
    }

    if (!readableContent || readableContent.error) {
      return {
        pdf: false,
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(readableContent, signal);

    return {
      pdf,
      name,
      message: urls.length > 1 ? 'One link at a time, sorry' : null,
    };
  } catch (error) {
    if (signal?.aborted || error.name === 'CancelledError') {
      return { error: true, message: 'Request cancelled.' };
    }

    console.error('handleUserMessage error:', error.name, error.message);

    return {
      pdf: false,
      message: getUserMessage(error),
      errorType: error.name,
      isRetryable: error.isRetryable,
    };
  }
};
