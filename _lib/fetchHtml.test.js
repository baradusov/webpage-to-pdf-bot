import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fetchHtml, MAX_BYTES } from './fetchHtml.js';

let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/small') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<html><body>ok</body></html>');
    }

    if (req.url === '/declared-huge') {
      res.writeHead(200, {
        'content-type': 'text/html',
        'content-length': String(MAX_BYTES * 10),
      });
      return res.end('<html></html>');
    }

    if (req.url === '/undeclared-huge') {
      res.writeHead(200, { 'content-type': 'text/html' });
      const chunk = 'x'.repeat(64 * 1024);
      const timer = setInterval(() => res.write(chunk), 1);
      res.on('close', () => clearInterval(timer));
      return;
    }

    res.writeHead(404).end('nope');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('the ceiling stays under what the process can survive', () => {
  assert.ok(MAX_BYTES <= 2_000_000, 'above 2 MB the parse outgrows the memory ceiling');
  assert.ok(MAX_BYTES >= 1_000_000, 'the heaviest real article measured was 0.75 MB');
});

test('an ordinary page is returned', async () => {
  const html = await fetchHtml(`${base}/small`);

  assert.match(html, /ok/);
});

test('a page that declares itself too big is refused before the body', async () => {
  await assert.rejects(() => fetchHtml(`${base}/declared-huge`), {
    name: 'TooLargeError',
  });
});

test('a page with no declared length is cut off while reading', async () => {
  await assert.rejects(() => fetchHtml(`${base}/undeclared-huge`), {
    name: 'TooLargeError',
  });
});

test('an error status becomes a network error', async () => {
  await assert.rejects(() => fetchHtml(`${base}/missing`), {
    name: 'NetworkError',
  });
});

test('a refusal carries something to show the sender', async () => {
  const error = await fetchHtml(`${base}/declared-huge`).catch((e) => e);

  assert.ok(error.userMessage.length > 10);
  assert.equal(error.isRetryable, false);
});
