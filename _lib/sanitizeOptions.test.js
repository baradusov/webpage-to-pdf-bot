import test from 'node:test';
import assert from 'node:assert/strict';
import sanitize from 'sanitize-html';
import { SANITIZE_OPTIONS } from './sanitizeOptions.js';

const clean = (html) => sanitize(html, SANITIZE_OPTIONS);

test('scripts and their contents are gone', () => {
  const out = clean('<p>keep</p><script>fetch("http://127.0.0.1/x")</script>');

  assert.ok(!/script/i.test(out));
  assert.ok(!/fetch/.test(out));
  assert.match(out, /keep/);
});

test('nothing that fetches from a stranger survives', () => {
  for (const tag of ['<iframe src="http://169.254.169.254/"></iframe>', '<video src="http://x/y.mp4"></video>', '<audio src="http://x/y.mp3"></audio>', '<object data="http://x"></object>', '<embed src="http://x">']) {
    assert.ok(!/<(iframe|video|audio|object|embed)/i.test(clean(tag)), tag);
  }
});

test('event handlers are dropped', () => {
  assert.ok(!/onerror/i.test(clean('<img src="x" onerror="alert(1)">')));
  assert.ok(!/onclick/i.test(clean('<p onclick="alert(1)">t</p>')));
});

test('javascript: links do not survive', () => {
  assert.ok(!/javascript:/i.test(clean('<a href="javascript:alert(1)">x</a>')));
});

test('what a printed page needs is kept', () => {
  const out = clean('<h2>Head</h2><p><strong>bold</strong> and <a href="https://x.com/a">link</a></p><table><tr><td colspan="2">cell</td></tr></table><img src="https://x.com/i.png" alt="pic">');

  assert.match(out, /<h2>Head<\/h2>/);
  assert.match(out, /<strong>bold<\/strong>/);
  assert.match(out, /href="https:\/\/x\.com\/a"/);
  assert.match(out, /colspan="2"/);
  assert.match(out, /<img[^>]+alt="pic"/);
});

test('text inside a dropped tag is kept', () => {
  assert.match(clean('<main><p>still here</p></main>'), /still here/);
});
