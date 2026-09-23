import test from 'node:test';
import assert from 'node:assert/strict';
import { telegramPost } from './telegramPost.js';
import { looksLikeHtml, isWholePage } from './pastedHtml.js';

test('a channel post goes to its embed view', () => {
  assert.deepEqual(telegramPost('https://t.me/durov/394'), {
    url: 'https://t.me/durov/394?embed=1',
    title: 'durov 394',
  });
  assert.equal(telegramPost('https://telegram.me/durov/394/').url, 'https://t.me/durov/394?embed=1');
});

test('other t.me pages are left alone', () => {
  for (const u of ['https://t.me/durov', 'https://t.me/s/durov/394', 'https://t.me/c/123/45', 'https://t.me/+AbCdEf', 'https://example.com/durov/394']) {
    assert.equal(telegramPost(u), null, u);
  }
});

test('pasted markup is told apart from text that merely has brackets', () => {
  assert.ok(looksLikeHtml('<div class="x">hi</div>'));
  assert.ok(looksLikeHtml('</p></body>'));
  assert.ok(!looksLikeHtml('I <3 PDFs and a > b'));
  assert.ok(!looksLikeHtml(undefined));
});

test('only a page with both ends counts as whole', () => {
  assert.ok(isWholePage('<!doctype html><html><body><p>x</p></body></html>'));
  assert.ok(!isWholePage('<html><head><title>cut at 4096'));
  assert.ok(!isWholePage('...rest</div></body></html>'));
});
