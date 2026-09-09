import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkError } from './errors.js';

test('a site that refuses the bot says so, and is not retryable', () => {
  for (const status of [401, 402, 403, 451]) {
    const e = new NetworkError('x', 'https://a.com', status);

    assert.match(e.userMessage, /does not let me in/);
    assert.equal(e.isRetryable, false);
  }
});

test('a broken or missing page still invites a retry', () => {
  for (const status of [404, 500, 503, null]) {
    const e = new NetworkError('x', 'https://a.com', status);

    assert.match(e.userMessage, /Check it and try again/);
    assert.equal(e.isRetryable, true);
  }
});
