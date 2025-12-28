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
      "Can't open the link. Please check if the URL is correct and the website is accessible 😞",
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
      "Can't extract content from this page. The website structure may not be supported 😞",
      false
    );
    this.name = 'ParseError';
    this.url = url;
  }
}

export class BrowserError extends BotError {
  constructor(message, url) {
    super(
      message,
      'Something went wrong while generating the PDF. Please try again later 😞',
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
      'The webpage is taking too long to load. Please try again later 😞',
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
