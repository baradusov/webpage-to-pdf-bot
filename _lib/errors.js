export class BotError extends Error {
  constructor(message, userMessage, isRetryable = false) {
    super(message);
    this.name = 'BotError';
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
  }
}

// A site that turns the server away will do it again: saying "try again" only
// sends people back for a second helping of the same refusal.
const REFUSED = [401, 402, 403, 451];

export class NetworkError extends BotError {
  constructor(message, url, status = null) {
    super(
      message,
      REFUSED.includes(status)
        ? "This site does not let me in 🙅 It blocks bots like me."
        : "Can't open this link 😞 Check it and try again.",
      !REFUSED.includes(status)
    );
    this.name = 'NetworkError';
    this.url = url;
    this.status = status;
  }
}

export class ParseError extends BotError {
  constructor(message, url) {
    super(
      message,
      "I can't find the text on this page 😞",
      false
    );
    this.name = 'ParseError';
    this.url = url;
  }
}

export class ScriptedPageError extends BotError {
  constructor(message, url) {
    super(
      message,
      'I see an empty page 🙅 It loads with scripts.\nSave the page as a file and send me the file.',
      false
    );
    this.name = 'ScriptedPageError';
    this.url = url;
  }
}

export class TooLargeError extends BotError {
  constructor(message, url) {
    super(
      message,
      'This page is too big 🙅 Send a shorter one.',
      false
    );
    this.name = 'TooLargeError';
    this.url = url;
  }
}

export class BrowserError extends BotError {
  constructor(message, url) {
    super(
      message,
      'Something went wrong 😞 Please try again later.',
      true
    );
    this.name = 'BrowserError';
    this.url = url;
  }
}

export class TimeoutError extends BotError {
  constructor(url) {
    super(
      `Request timed out for ${url}`,
      'This page is too slow 😞 Please try again later.',
      true
    );
    this.name = 'TimeoutError';
    this.url = url;
  }
}

export class CancelledError extends BotError {
  constructor() {
    super('Request cancelled', 'Request was cancelled.', false);
    this.name = 'CancelledError';
  }
}

export const getUserMessage = (error) => {
  if (error instanceof BotError) {
    return error.userMessage;
  }
  return 'Something went wrong 😞';
};
