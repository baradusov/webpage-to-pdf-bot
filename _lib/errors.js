export class BotError extends Error {
  constructor(message, userMessage, isRetryable = false) {
    super(message);
    this.name = 'BotError';
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
  }
}

export class NetworkError extends BotError {
  constructor(message, url) {
    super(
      message,
      "Can't open this link 😞 Check it and try again.",
      true
    );
    this.name = 'NetworkError';
    this.url = url;
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
