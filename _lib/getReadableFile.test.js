import test from 'node:test';
import assert from 'node:assert/strict';
import { getReadableFile } from './getReadableContent.js';
import { isReadableDocument, getFileHtml } from './getFileHtml.js';

const article = `<!doctype html><html><head><title>Saved Article</title></head>
<body><article><h1>Saved Article</h1><p>${'Real prose here. '.repeat(40)}</p></article></body></html>`;

const chatExport = `<!doctype html><html><head><title>ChatExport</title>
<script>fetch('http://127.0.0.1/steal')</script><style>b{color:red}</style></head>
<body><div class="message"><div class="text">A message long enough to matter.</div></div>
<div class="message"><div class="text">Another message, also long enough.</div></div></body></html>`;

test('a saved article goes through the extractor', async () => {
  const r = await getReadableFile(article, 'Saved Article.html');

  assert.match(r.content, /Real prose here/);
  assert.equal(r.title, 'Saved Article');
});

test('a page with no article falls back to its body', async () => {
  const r = await getReadableFile(chatExport, 'ChatExport_2026.html');

  assert.match(r.content, /A message long enough/);
  assert.match(r.content, /Another message/);
});

test('the fallback strips scripts and styles', async () => {
  const r = await getReadableFile(chatExport, 'ChatExport_2026.html');

  assert.ok(!/<script/i.test(r.content), 'no script tag');
  assert.ok(!/fetch\(/.test(r.content), 'no script body either');
  assert.ok(!/<style/i.test(r.content), 'no style tag');
});

test('the file name stands in for the source, never a link', async () => {
  const r = await getReadableFile(article, 'Saved Article.html');

  assert.equal(r.url, 'Saved Article.html');
  assert.ok(!/^https?:/.test(r.url));
});

test('a title is taken from the file name when the page has none', async () => {
  const r = await getReadableFile('<html><body><p>Bare text here.</p></body></html>', 'notes.html');

  assert.equal(r.title, 'notes');
});

test('an empty file is refused', async () => {
  await assert.rejects(() => getReadableFile('<html><body></body></html>', 'empty.html'), {
    name: 'ParseError',
  });
});

test('only html and text documents are accepted', () => {
  assert.ok(isReadableDocument({ mime_type: 'text/html' }));
  assert.ok(isReadableDocument({ mime_type: 'text/plain' }));
  assert.ok(isReadableDocument({ file_name: 'quiz.htm' }));
  assert.ok(isReadableDocument({ mime_type: 'application/octet-stream', file_name: 'a.html' }));

  assert.ok(!isReadableDocument({ mime_type: 'application/pdf', file_name: 'a.pdf' }));
  assert.ok(!isReadableDocument({ mime_type: 'image/png', file_name: 'a.png' }));
  assert.ok(!isReadableDocument(undefined));
});

test('the bot token never reaches an error message', async () => {
  const api = {
    token: 'SECRET-TOKEN',
    getFile: async () => ({ file_path: 'documents/file_1.html' }),
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('boom');
  };

  try {
    await getFileHtml(api, { file_id: 'a', file_name: 'notes.html', file_size: 10 });
    assert.fail('should have thrown');
  } catch (error) {
    assert.equal(error.url, 'notes.html');
    assert.ok(!JSON.stringify(error).includes('SECRET-TOKEN'));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a file over the upload limit is refused before download', async () => {
  const api = {
    token: 'SECRET-TOKEN',
    getFile: async () => assert.fail('must not reach Telegram'),
  };

  await assert.rejects(
    () => getFileHtml(api, { file_id: 'a', file_name: 'big.html', file_size: 9_000_000 }),
    { name: 'TooLargeError' }
  );
});

test('a fallback marks itself as not cleaned up', async () => {
  const r = await getReadableFile(chatExport, 'ChatExport_2026.html');

  assert.equal(r.degraded, true);
});

test('an extracted article is not marked degraded', async () => {
  const r = await getReadableFile(article, 'Saved Article.html');

  assert.ok(!r.degraded);
});

test('a file name loses its extension but keeps the rest', async () => {
  const r = await getReadableFile('<html><body><p>Bare text here.</p></body></html>', 'IBPS PO - Prelims 08.html');

  assert.equal(r.title, 'IBPS PO - Prelims 08');
});

test('a file between the page and upload limits is accepted', async () => {
  const api = {
    token: 'T',
    getFile: async () => ({ file_path: 'documents/f.html' }),
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: new Map([['content-length', '3000000']]),
    body: (async function* () {
      yield Buffer.from('<html><body><p>big but fine</p></body></html>');
    })(),
  });

  try {
    const html = await getFileHtml(api, { file_id: 'a', file_name: 'mid.html', file_size: 3_000_000 });
    assert.match(html, /big but fine/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
