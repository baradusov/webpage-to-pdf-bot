import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './escapeHtml.js';

test('a title cannot close its tag and open a script', () => {
  const evil = 'X</h1><script>fetch("http://127.0.0.1/x")</script><h1>';
  const safe = escapeHtml(evil);

  assert.ok(!safe.includes('<script'));
  assert.ok(!safe.includes('</h1>'));
  assert.ok(safe.includes('&lt;script&gt;'));
});

test('a title cannot break out of an attribute', () => {
  assert.equal(escapeHtml('a" onload="alert(1)'), 'a&quot; onload=&quot;alert(1)');
  assert.equal(escapeHtml("a' onload='alert(1)"), 'a&#39; onload=&#39;alert(1)');
});

test('ampersands are escaped first, not twice', () => {
  assert.equal(escapeHtml('a&b'), 'a&amp;b');
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('ordinary titles survive unchanged', () => {
  assert.equal(escapeHtml('Хорошая статья про PDF'), 'Хорошая статья про PDF');
});

test('missing values become empty, not the word undefined', () => {
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
});
